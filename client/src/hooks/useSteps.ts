import { useState, useEffect } from 'react';
import { FileItem, Step, StepType } from '../types/types';
import axios from 'axios';
import { parseXml } from '../utils/parser';

const BACKEND_URL = "http://localhost:3000";

export function useSteps(prompt: string) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);

  // Initialize and fetch data
  const init = async () => {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    });

    setLoading(false);

    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as "pending"
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}]);
  };

  // Process steps and update files
  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;

        // Clean up code content - remove markdown code blocks if present
        let codeContent = step.code || '';
        
        // Remove markdown code blocks if they exist (```tsx or ```javascript etc.)
        if (codeContent.startsWith('```')) {
          // Extract the actual code from the markdown code block
          const codeBlockRegex = /```(?:.*?)\n([\s\S]*?)```/;
          const match = codeContent.match(codeBlockRegex);
          if (match && match[1]) {
            codeContent = match[1];
          } else {
            // If the specific regex didn't match, try a more general one
            const generalRegex = /```([\s\S]*?)```/;
            const generalMatch = codeContent.match(generalRegex);
            if (generalMatch && generalMatch[1]) {
              // Check if the first line contains the language specification
              const lines = generalMatch[1].split('\n');
              if (lines[0].trim().match(/^[a-zA-Z]+$/)) {
                // Remove the language specification line
                codeContent = lines.slice(1).join('\n');
              } else {
                codeContent = generalMatch[1];
              }
            }
          }
        }

        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder = `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);

          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: codeContent
              });
            } else {
              file.content = codeContent;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              });
            }

            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }
    });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps(steps => steps.map((s: Step) => ({
          ...s,
          status: "completed"
      })));
    }
  }, [steps, files]);

  // Initialize on component mount
  useEffect(() => {
    init();
  }, [prompt]);

  return {
    steps,
    files,
    llmMessages,
    loading,
    templateSet
  };
} 