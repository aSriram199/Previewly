"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("./prompts");
const cors_1 = __importDefault(require("cors"));
if (!process.env.OPENAI_API_KEY) {
    console.error("[Server] FATAL: OPENAI_API_KEY is not set in environment variables.");
    process.exit(1);
}
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
app.post("/template", async (req, res) => {
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
                    content: "Return either 'node' or 'react' based on what this project should be. Only return a single word — 'node' or 'react'. Do not return anything extra.",
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
                    prompts_1.BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${prompts_1.React_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [prompts_1.React_Prompt],
            });
            return;
        }
        if (answer === "node") {
            res.json({
                prompts: [
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${prompts_1.Node_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [prompts_1.Node_Prompt],
            });
            return;
        }
        res.status(422).json({ message: "Could not classify the prompt as 'react' or 'node'." });
    }
    catch (error) {
        console.error("[POST /template] Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
app.post("/chat", async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ message: "Missing or empty 'messages' array in request body." });
        return;
    }
    const MAX_MESSAGES = 20;
    try {
        const recentMessages = messages.slice(-MAX_MESSAGES);
        const chatMessages = recentMessages[0]?.role === "system"
            ? recentMessages
            : [{ role: "system", content: (0, prompts_1.getSystemPrompt)() }, ...recentMessages];
        const response = await openai.chat.completions.create({
            messages: chatMessages,
            model: "gpt-4o",
            max_tokens: 8000,
        });
        const content = response.choices[0].message.content ?? "";
        res.json({ response: content });
    }
    catch (error) {
        console.error("[POST /chat] Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
app.use((_req, res) => {
    res.status(404).json({ message: "Route not found." });
});
app.use((err, _req, res, _next) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({ message: "Internal server error." });
});
app.listen(port, () => {
    console.log(`[Server] Running on port ${port}`);
});
//# sourceMappingURL=index.js.map