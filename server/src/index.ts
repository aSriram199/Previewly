require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { BASE_PROMPT, getSystemPrompt, React_Prompt, Node_Prompt } from "./prompts";
import cors from "cors";

if (!process.env.OPENAI_API_KEY) {
  console.error("[Server] FATAL: OPENAI_API_KEY is not set in environment variables.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

app.post("/template", async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ message: "Missing or empty 'prompt' in request body." });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Return either 'node' or 'react' based on what this project should be. Only return a single word — 'node' or 'react'. Do not return anything extra.",
        },
        {
          role: "user",
          content: prompt.trim(),
        },
      ],
      model: "gpt-4o-mini",
      max_tokens: 10,
    });

    const answer = response.choices[0].message.content?.trim().toLowerCase() ?? "";

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${React_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [React_Prompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${Node_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [Node_Prompt],
      });
      return;
    }

    res.status(422).json({ message: "Could not classify the prompt as 'react' or 'node'." });
  } catch (error) {
    console.error("[POST /template] Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/chat", async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "Missing or empty 'messages' array in request body." });
    return;
  }

  const MAX_MESSAGES = 20;

  try {
    const recentMessages = messages.slice(-MAX_MESSAGES);
    const chatMessages =
      recentMessages[0]?.role === "system"
        ? recentMessages
        : [{ role: "system", content: getSystemPrompt() }, ...recentMessages];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      messages: chatMessages as OpenAI.Chat.ChatCompletionMessageParam[],
      model: "gpt-4o",
      max_tokens: 8000,
      stream: true,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, response: fullContent })}\n\n`);
    res.end();
  } catch (error) {
    console.error("[POST /chat] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted." })}\n\n`);
      res.end();
    }
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(port, () => {
  console.log(`[Server] Running on port ${port}`);
});
