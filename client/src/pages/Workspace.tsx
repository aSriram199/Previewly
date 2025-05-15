import  { useEffect, useState } from 'react';
import { Folder, File, Code as CodeIcon, Eye, Plus, ChevronRight, CheckCircle2 } from 'lucide-react';
import { usePrompt } from '../context/PromptContext';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { FileItem, Step, StepType } from '../types/types';
import { parseXml } from '../utils/parser';
import { useWebContainer } from '../hooks/useWebContainer';



const BACKEND_URL = "http://localhost:3000"

export default function Workspace() {
  const webcontainer = useWebContainer();
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const { prompt } = usePrompt();
  // const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  // const [currentStep, setCurrentStep] = useState(1);
  // const [selectedFile, setSelectedFile] = useState<FileItem| null>(null);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [editorContent, setEditorContent] = useState<string>(`import React from 'react';
export default function Header() {
  return (
    <header className="bg-gray-900 text-white">
      {/* Code content */}
    </header>
  );
}`);


useEffect(() => {
  let originalFiles = [...files];
  let updateHappened = false;
  steps.filter(({status}) => status === "pending").map(step => {
    updateHappened = true;
    if (step?.type === StepType.CreateFile) {
      let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
      let currentFileStructure = [...originalFiles]; // {}
      let finalAnswerRef = currentFileStructure;

      let currentFolder = ""
      while(parsedPath.length) {
        currentFolder =  `${currentFolder}/${parsedPath[0]}`;
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
              content: step.code
            })
          } else {
            file.content = step.code;
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
            })
          }

          currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
        }
      }
      originalFiles = finalAnswerRef;
    }

  })

  if (updateHappened) {

    setFiles(originalFiles)
    setSteps(steps => steps.map((s: Step) => {
      return {
        ...s,
        status: "completed"
      }
      
    }))
  }
  console.log(files);
}, [steps, files]);

useEffect(() => {
  const createMountStructure = (files: FileItem[]): Record<string, any> => {
    const mountStructure: Record<string, any> = {};

    const processFile = (file: FileItem, isRootFolder: boolean) => {  
      if (file.type === 'folder') {
        // For folders, create a directory entry
        mountStructure[file.name] = {
          directory: file.children ? 
            Object.fromEntries(
              file.children.map(child => [child.name, processFile(child, false)])
            ) 
            : {}
        };
      } else if (file.type === 'file') {
        if (isRootFolder) {
          mountStructure[file.name] = {
            file: {
              contents: file.content || ''
            }
          };
        } else {
          // For files, create a file entry with contents
          return {
            file: {
              contents: file.content || ''
            }
          };
        }
      }

      return mountStructure[file.name];
    };

    // Process each top-level file/folder
    files.forEach(file => processFile(file, true));

    return mountStructure;
  };

  const mountStructure = createMountStructure(files);

  // Mount the structure if WebContainer is available
  console.log(mountStructure);
  webcontainer?.mount(mountStructure);
}, [files, webcontainer]);


async function init() {
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
  })

  setLoading(false);

  setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
    ...x,
    status: "pending" as "pending"
  }))]);

  setLlmMessages([...prompts, prompt].map(content => ({
    role: "user",
    content
  })));

   setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
}

useEffect(() => {
  init();
}, [])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      <div className="w-1/4 border-r border-gray-800 p-4">
          {/* Display the prompt */}
          <div className="mt-8 mb-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-md font-medium mb-2">Prompt:</h3>
          <p className="text-sm text-gray-300">{prompt}</p>
        </div>

       {/* Progress Panel */}
        <h2 className="text-xl font-semibold mb-6">Generation Progress</h2>
        <div className="space-y-4">
          <div className="bg-gray-800 h-2 rounded-full mb-8">
            <div className="bg-blue-500 h-full w-3/4 rounded-full"></div>
          </div>
          
          <ProgressItem
            title="Project Setup"
            status="completed"
            description="Initializing project structure"
          />
          <ProgressItem
            title="Component Generation"
            status="in-progress"
            description="Creating React components"
          />
          <ProgressItem
            title="Styling"
            status="pending"
            description="Applying custom styles"
          />
        </div>
        
       
      </div>

      {/* Files Panel */}
      <div className="w-[15%] border-r border-gray-800 p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Files</h2>
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* <div className="space-y-2">
          <FileItem name="src" type="folder" expanded={true}>
            <FileItem name="components" type="folder" expanded={true}>
              <FileItem name="Header.tsx" type="file" />
              <FileItem name="Footer.tsx" type="file" />
            </FileItem>
            <FileItem name="App.tsx" type="file" />
          </FileItem>
          <FileItem name="public" type="folder" />
        </div> */}
      </div>

      {/* Editor Panel */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-800 p-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'code' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              <CodeIcon className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'preview' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          {activeTab === 'code' ? (
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={editorContent}
              theme="vs-dark"
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true
              }}
            />
          ) : (
            <div className="bg-white rounded-lg h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressItem({ title, status, description }: { 
  title: string; 
  status: 'completed' | 'in-progress' | 'pending'; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800">
      <CheckCircle2 className={`w-5 h-5 mt-1 ${
        status === 'completed' ? 'text-green-500' :
        status === 'in-progress' ? 'text-blue-500' : 'text-gray-600'
      }`} />
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// function FileItem({ name, type, expanded, children }: { 
//   name: string; 
//   type: 'file' | 'folder'; 
//   expanded?: boolean;
//   children?: React.ReactNode;
// }) {
//   const [isExpanded, setIsExpanded] = useState(expanded);

//   return (
//     <div>
//       <div 
//         className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 cursor-pointer"
//         onClick={() => type === 'folder' && setIsExpanded(!isExpanded)}
//       >
//         {type === 'folder' && (
//           <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
//         )}
//         {type === 'folder' ? <Folder className="w-4 h-4 text-blue-400" /> : <File className="w-4 h-4 text-gray-400" />}
//         <span className="text-sm">{name}</span>
//       </div>
//       {isExpanded && type === 'folder' && (
//         <div className="ml-4">{children}</div>
//       )}
//     </div>
//   );
// }