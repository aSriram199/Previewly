import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../context/WebContainerContext';
import { Loader } from '../components/Loader';
import { buildFileTree } from '../utils/fileTree';

type LocationState = { prompt: string; prebuiltResponse?: string } | null;

export function Builder() {
  const location = useLocation();
  const state = location.state as LocationState;

  // Guard: redirect home if navigated here without a prompt
  if (!state?.prompt) {
    return <Navigate to="/" replace />;
  }

  const { prompt, prebuiltResponse } = state;

  const [userPrompt, setUserPrompt] = useState('');
  const [llmMessages, setLlmMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  // Apply pending file-creation steps to the file tree.
  // Guard: only run when there are actually pending CreateFile steps to avoid wasteful renders.
  const hasPendingFileSteps = steps.some(
    (s) => s.status === 'pending' && s.type === StepType.CreateFile
  );
  useEffect(() => {
    if (!hasPendingFileSteps) return;
    const { files: updatedFiles, changed } = buildFileTree(steps, files);
    if (changed) {
      setFiles(updatedFiles);
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' as const })));
    }
  }, [steps]);

  // Write changed files into the WebContainer incrementally (avoid full remount on every update).
  useEffect(() => {
    if (!webcontainer || files.length === 0) return;

    const writeFiles = async (items: FileItem[], basePath = '') => {
      for (const item of items) {
        const fullPath = `${basePath}/${item.name}`;
        if (item.type === 'folder') {
          await webcontainer.fs.mkdir(fullPath, { recursive: true }).catch(() => { });
          if (item.children) await writeFiles(item.children, fullPath);
        } else {
          await webcontainer.fs.writeFile(fullPath, item.content ?? '');
        }
      }
    };

    writeFiles(files);
  }, [files, webcontainer]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim(),
    });
    setTemplateSet(true);

    const { prompts, uiPrompts } = response.data;
    setSteps(
      parseXml(uiPrompts[0]).map((x: Step) => ({ ...x, status: 'pending' as const }))
    );

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map((content) => ({ role: 'user', content })),
    });
    setLoading(false);

    setSteps((s) => {
      const highestId = s.reduce((max, step) => Math.max(max, step.id), 0);
      return [
        ...s,
        ...parseXml(stepsResponse.data.response).map((x, index) => ({
          ...x,
          id: highestId + index + 1,
          status: 'pending' as const,
        })),
      ];
    });

    const initialMessages = [...prompts, prompt].map((content) => ({ role: 'user' as const, content }));
    setLlmMessages([...initialMessages, { role: 'assistant', content: stepsResponse.data.response }]);
  }

  // Sends the current userPrompt to /chat and appends the response steps
  async function handleSendMessage() {
    if (!userPrompt.trim() || prebuiltResponse) return;

    const newMessage = { role: 'user' as const, content: userPrompt };
    setLoading(true);

    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...llmMessages, newMessage],
    });
    setLoading(false);

    const assistantMessage = { role: 'assistant' as const, content: stepsResponse.data.response };
    setLlmMessages((prev) => [...prev, newMessage, assistantMessage]);
    setUserPrompt('');

    setSteps((s) => {
      const highestId = s.reduce((max, step) => Math.max(max, step.id), 0);
      return [
        ...s,
        ...parseXml(stepsResponse.data.response).map((x, index) => ({
          ...x,
          id: highestId + index + 1,
          status: 'pending' as const,
        })),
      ];
    });
  }

  useEffect(() => {
    if (prebuiltResponse && prebuiltResponse.trim().length > 0) {
      setTemplateSet(true);
      setSteps(parseXml(prebuiltResponse).map((x: Step) => ({ ...x, status: 'pending' as const })));
      setLlmMessages([{ role: 'assistant', content: prebuiltResponse }]);
      return;
    }
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-blue-900 flex flex-col relative overflow-hidden">
      {/* Decorative blurred background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gradient-radial from-purple-700/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-blue-700/40 to-transparent rounded-full blur-2xl animate-pulse" />
      </div>
      <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 border-b border-purple-800 px-8 py-6 shadow-lg z-10">
        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg">Website Builder</h1>
        <p className="text-base text-gray-300 mt-1 font-mono">
          Prompt: <span className="text-purple-300">{prompt}</span>
        </p>
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
                <div className="flex flex-col gap-2">
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && (
                    <>
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className="p-2 w-full rounded-lg bg-gray-800 text-gray-100 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                        placeholder="Ask for a new feature or change..."
                        disabled={!!prebuiltResponse}
                      />
                      <button
                        disabled={!!prebuiltResponse || !userPrompt.trim()}
                        title={prebuiltResponse ? 'Disabled for prebuilt content' : undefined}
                        onClick={handleSendMessage}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* File Explorer */}
          <div className="col-span-2">
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>
          {/* Main Content: Code/Preview */}
          <div className="col-span-7 bg-gray-900/90 rounded-2xl shadow-2xl p-6 h-[calc(100vh-10rem)] border border-blue-900">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer!} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}