require("dotenv").config();
import express from "express";
import OpenAI from "openai";
import { BASE_PROMPT, getSystemPrompt, React_Prompt, Node_Prompt } from "./prompts";
import cors from "cors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors())
app.use(express.json())

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
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${React_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [React_Prompt]
        })
        return;
    }

    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${Node_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [Node_Prompt]
        })
        return;
    }

    res.status(403).json({message: "You cant access this"})
    return;
})

app.post("/chat", async (req, res) => {
    const messages = req.body.messages;
    
    // Add system message if not already present
    const chatMessages = Array.isArray(messages) ? 
        (messages[0]?.role === 'system' ? 
            messages : 
            [{ role: 'system', content: getSystemPrompt() }, ...messages]) :
        [{ role: 'system', content: getSystemPrompt() }];
    
    const response = await openai.chat.completions.create({
        messages: chatMessages,
        model: 'gpt-4',
        max_tokens: 3000
    });

    console.log(response);

    res.json({
        response: response.choices[0].message.content
    });
})

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
