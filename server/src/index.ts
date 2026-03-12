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

// POST /template
// Uses gpt-4o-mini (cheap/fast) to classify the prompt as 'react' or 'node'.
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
      model: "gpt-4o-mini", // Cheap classification — no need for gpt-4o here
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

// POST /chat
// Sends messages to gpt-4o. Truncates history to last 20 messages to avoid context overflow.
app.post("/chat", async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "Missing or empty 'messages' array in request body." });
    return;
  }

  const MAX_MESSAGES = 20;

  try {
    // Always keep at most MAX_MESSAGES of recent history to prevent context window overflow
    const recentMessages = messages.slice(-MAX_MESSAGES);
    const chatMessages =
      recentMessages[0]?.role === "system"
        ? recentMessages
        : [{ role: "system", content: getSystemPrompt() }, ...recentMessages];

    const response = await openai.chat.completions.create({
      messages: chatMessages,
      model: "gpt-4o",
      max_tokens: 8000,
    });

    const content = response.choices[0].message.content ?? "";
    res.json({ response: content });
  } catch (error) {
    console.error("[POST /chat] Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// 404 catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(3000, () => {
  console.log("[Server] Running on port 3000");
});
