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
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post("/template", async (req, res) => {
    const prompt = req.body.prompt;
    const response = await openai.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        model: 'gpt-4',
        max_tokens: 80
    });
    const answer = response.choices[0].message.content?.trim().toLowerCase() || "";
    if (answer === "react") {
        res.json({
            prompts: [prompts_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${prompts_1.React_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [prompts_1.React_Prompt]
        });
        return;
    }
    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${prompts_1.Node_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [prompts_1.Node_Prompt]
        });
        return;
    }
    res.status(403).json({ message: "You cant access this" });
    return;
});
app.post("/chat", async (req, res) => {
    const messages = req.body.messages;
    const chatMessages = Array.isArray(messages) ?
        (messages[0]?.role === 'system' ?
            messages :
            [{ role: 'system', content: (0, prompts_1.getSystemPrompt)() }, ...messages]) :
        [{ role: 'system', content: (0, prompts_1.getSystemPrompt)() }];
    const response = await openai.chat.completions.create({
        messages: chatMessages,
        model: 'gpt-4',
        max_tokens: 3000
    });
    console.log(response);
    res.json({
        response: response.choices[0].message.content
    });
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
//# sourceMappingURL=index.js.map