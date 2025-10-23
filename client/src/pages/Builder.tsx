import  { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';

export function Builder() {
  const location = useLocation();
  const { prompt, prebuiltResponse } = location.state as { prompt: string; prebuiltResponse?: string };
  console.log('[Builder] Loaded with initial prompt:', prompt);
  if (prebuiltResponse) {
    console.log('[Builder] Prebuilt response mode enabled');
  }
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    console.log('[Builder] steps effect triggered. pending steps count:', steps.filter(({status}) => status === "pending").length);
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
      console.log('[Builder] Files updated from steps. New file tree:', originalFiles);

      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
        
      }))
    }
    console.log('[Builder] Current files state:', files);
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
    console.log('[Builder] Mounting structure:', mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    console.log('[Builder] init() start');
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    console.log("/template response:", response.data);
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;
    console.log('[Builder] template prompts length:', prompts?.length, '| uiPrompts length:', uiPrompts?.length);

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    console.log('[Builder] Calling /chat with messages count:', [...prompts, prompt].length);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })
    console.log("/chat response (init):", stepsResponse.data);

    setLoading(false);

    setSteps(s => {
      // Find the highest existing ID
      const highestId = Math.max(...s.map(step => step.id), 0);
      
      return [
        ...s, 
        ...parseXml(stepsResponse.data.response).map((x, index) => ({
          ...x,
          id: highestId + index + 1, // Ensure unique IDs by incrementing from highest
          status: "pending" as "pending"
        }))
      ];
    });

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
    console.log('[Builder] init() end');
  }

  useEffect(() => {
    if (prebuiltResponse && typeof prebuiltResponse === 'string' && prebuiltResponse.trim().length > 0) {
      console.log('[Builder] Using prebuilt response to set steps');
      setTemplateSet(true);
      setSteps(parseXml(prebuiltResponse).map((x: Step) => ({
        ...x,
        status: 'pending'
      })));
      setLlmMessages(x => [...x, { role: 'assistant', content: prebuiltResponse }]);
      return;
    }
    init();
  }, [])

  return (
   
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-blue-900 flex flex-col relative overflow-hidden">
      {/* Decorative blurred background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gradient-radial from-purple-700/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-blue-700/40 to-transparent rounded-full blur-2xl animate-pulse" />
      </div>
      <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 border-b border-purple-800 px-8 py-6 shadow-lg z-10">
        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg">Website Builder</h1>
        <p className="text-base text-gray-300 mt-1 font-mono">Prompt: <span className='text-purple-300'>{prompt}</span></p>
      </header>
      <div className="flex-1 overflow-hidden z-10">
        <div className="h-full grid grid-cols-12 gap-8 p-8">
          {/* Sidebar: Steps and chat */}
          <div className="col-span-3 space-y-8 overflow-auto bg-gray-900/80 rounded-2xl shadow-xl p-6 backdrop-blur-md border border-purple-900">
            <div>
              <div className="max-h-[60vh] overflow-scroll custom-scrollbar">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div className="mt-6">
                <div className='flex flex-col gap-2'>
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && <>
                    <textarea value={userPrompt} onChange={(e) => {
                      setPrompt(e.target.value)
                    }} className='p-2 w-full rounded-lg bg-gray-800 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400' placeholder='Ask for a new feature or change...' />
                    <button disabled={!!prebuiltResponse} title={prebuiltResponse ? 'Disabled for prebuilt content' : undefined} onClick={async () => {
                      if (prebuiltResponse) {
                        console.log('[Builder] Chat disabled in prebuilt mode');
                        return;
                      }
                      const newMessage = {
                        role: "user" as "user",
                        content: userPrompt
                      };
                      setLoading(true);
                    console.log('[Builder] Sending user message to /chat');
                    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                        messages: [...llmMessages, newMessage]
                      });
                    console.log("/chat response (user send):", stepsResponse.data);
                      setLoading(false);
                      setLlmMessages(x => [...x, newMessage]);
                      setLlmMessages(x => [...x, {
                        role: "assistant",
                        content: stepsResponse.data.response
                      }]);
                    console.log('[Builder] Appended new steps from response');
                      setSteps(s => {
                        // Find the highest existing ID
                        const highestId = Math.max(...s.map(step => step.id), 0);
                        
                        return [
                          ...s, 
                          ...parseXml(stepsResponse.data.response).map((x, index) => ({
                            ...x,
                            id: highestId + index + 1, // Ensure unique IDs
                            status: "pending" as "pending"
                          }))
                        ];
                      });
                    }} className='bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:from-purple-600 hover:to-blue-600 transition-all'>Send</button>
                  </>}
                </div>
              </div>
            </div>
          </div>
          {/* File Explorer */}
          <div className="col-span-2">
            <FileExplorer 
              files={files} 
              onFileSelect={setSelectedFile}
            />
          </div>
          {/* Main Content: Code/Preview */}
          <div className="col-span-7 bg-gray-900/90 rounded-2xl shadow-2xl p-6 h-[calc(100vh-10rem)] border border-blue-900">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer!} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}