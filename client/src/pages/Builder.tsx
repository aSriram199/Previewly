import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { API_BASE_URL, buildApiUrl } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../context/WebContainerContext';
import { Loader } from '../components/Loader';
import { buildFileTree } from '../utils/fileTree';
import { ArrowRight } from 'lucide-react';

type LocationState = { prompt: string; prebuiltResponse?: string } | null;
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type InitPayload = {
  prompts: string[];
  uiPrompts: string[];
  response: string;
};

const pendingInitRequests = new Map<string, Promise<InitPayload>>();

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    const responseMessage =
      responseData &&
      typeof responseData === 'object' &&
      'message' in responseData &&
      typeof responseData.message === 'string'
        ? responseData.message
        : undefined;

    if (responseMessage) {
      return responseMessage;
    }

    if (error.response?.status === 404) {
      return `The backend API route was not found at ${API_BASE_URL}. Start the server or update your API URL settings.`;
    }

    if (error.code === 'ERR_NETWORK') {
      return `Could not reach the backend at ${API_BASE_URL}. Start the server or update your API URL settings.`;
    }
  }

  return fallback;
}

async function loadBuilderInit(prompt: string) {
  const normalizedPrompt = prompt.trim();
  const existingRequest = pendingInitRequests.get(normalizedPrompt);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const templateResponse = await axios.post(buildApiUrl('/template'), {
      prompt: normalizedPrompt,
    });

    const { prompts, uiPrompts } = templateResponse.data as {
      prompts: string[];
      uiPrompts: string[];
    };

    const stepsResponse = await axios.post(buildApiUrl('/chat'), {
      messages: [...prompts, normalizedPrompt].map((content) => ({
        role: 'user' as const,
        content,
      })),
    });

    return {
      prompts,
      uiPrompts,
      response: stepsResponse.data.response as string,
    };
  })();

  pendingInitRequests.set(normalizedPrompt, request);
  void request.finally(() => {
    if (pendingInitRequests.get(normalizedPrompt) === request) {
      pendingInitRequests.delete(normalizedPrompt);
    }
  });

  return request;
}

export function Builder() {
  const location = useLocation();
  const state = location.state as LocationState;

  // Guard: redirect home if navigated here without a prompt
  if (!state?.prompt) {
    return <Navigate to="/" replace />;
  }

  const { prompt, prebuiltResponse } = state;

  const [userPrompt, setUserPrompt] = useState('');
  const [llmMessages, setLlmMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initAttempt, setInitAttempt] = useState(0);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  // Apply pending file-creation steps to the file tree.
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

  // Write changed files into the WebContainer incrementally.
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

  // Sends the current userPrompt to /chat and appends the response steps
  async function handleSendMessage() {
    if (!userPrompt.trim() || prebuiltResponse) return;

    const newMessage = { role: 'user' as const, content: userPrompt };
    setErrorMessage('');
    setLoading(true);

    try {
      const stepsResponse = await axios.post(buildApiUrl('/chat'), {
        messages: [...llmMessages, newMessage],
      });

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
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to send your message right now.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (prebuiltResponse && prebuiltResponse.trim().length > 0) {
      setTemplateSet(true);
      setIsInitializing(false);
      setErrorMessage('');
      setSteps(parseXml(prebuiltResponse).map((x: Step) => ({ ...x, status: 'pending' as const })));
      setLlmMessages([{ role: 'assistant', content: prebuiltResponse }]);
      return;
    }

    let active = true;

    setCurrentStep(1);
    setSelectedFile(null);
    setFiles([]);
    setSteps([]);
    setTemplateSet(false);
    setErrorMessage('');
    setIsInitializing(true);

    void loadBuilderInit(prompt)
      .then(({ prompts, uiPrompts, response }) => {
        if (!active) return;

        const templateSteps = parseXml(uiPrompts[0]).map((x: Step) => ({
          ...x,
          status: 'pending' as const,
        }));
        const highestId = templateSteps.reduce((max, step) => Math.max(max, step.id), 0);
        const generatedSteps = parseXml(response).map((x, index) => ({
          ...x,
          id: highestId + index + 1,
          status: 'pending' as const,
        }));
        const initialMessages = [...prompts, prompt].map((content) => ({
          role: 'user' as const,
          content,
        }));

        setTemplateSet(true);
        setSteps([...templateSteps, ...generatedSteps]);
        setLlmMessages([...initialMessages, { role: 'assistant', content: response }]);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          getApiErrorMessage(error, 'Unable to initialize the builder right now.')
        );
      })
      .finally(() => {
        if (active) {
          setIsInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [prebuiltResponse, prompt, initAttempt]);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" style={{ opacity: 0.4, top: '-5%', left: '-3%' }} />
      <div className="ambient-orb ambient-orb-2" style={{ opacity: 0.35 }} />

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 z-10 flex-shrink-0"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="pulse-dot" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Previewly
          </span>
          <span
            className="hidden sm:block text-xs px-2 py-0.5 rounded-md font-mono truncate"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              maxWidth: 340,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {prompt}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden z-10">
        <div
          className="h-full grid"
          style={{
            gridTemplateColumns: '280px 200px 1fr',
            gap: '1px',
            background: 'var(--border-subtle)',
          }}
        >
          {/* ── Sidebar: Steps + Chat ───────────────────────── */}
          <aside
            className="flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>

            {/* Chat input */}
            <div
              className="p-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              {errorMessage && (
                <div
                  className="mb-3 rounded-lg px-3 py-2 text-xs fade-up"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5',
                  }}
                >
                  <p>{errorMessage}</p>
                  {!templateSet && (
                    <button
                      onClick={() => setInitAttempt((a) => a + 1)}
                      className="mt-2 text-xs font-semibold underline underline-offset-2 hover:no-underline transition-all"
                      style={{ color: '#f87171' }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {(isInitializing || loading) && <Loader />}

              {!isInitializing && templateSet && (
                <div className="flex flex-col gap-2 fade-up">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendMessage();
                    }}
                    className="w-full resize-none rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      minHeight: 72,
                    }}
                    placeholder="Ask for a change or new feature…"
                    disabled={!!prebuiltResponse}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-active)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    disabled={!!prebuiltResponse || !userPrompt.trim()}
                    onClick={handleSendMessage}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: userPrompt.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: userPrompt.trim() ? '#0d0f12' : 'var(--text-muted)',
                      cursor: userPrompt.trim() ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={(e) => {
                      if (userPrompt.trim())
                        (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                    }}
                  >
                    Send <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ── File Explorer ───────────────────────────────── */}
          <div
            className="overflow-hidden"
            style={{ background: 'var(--bg-surface)' }}
          >
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>

          {/* ── Code / Preview Panel ────────────────────────── */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-base)' }}
          >
            <div className="px-4 pt-4 flex-shrink-0">
              <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-4">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : webcontainer ? (
                <PreviewFrame webContainer={webcontainer} />
              ) : (
                <div
                  className="h-full flex flex-col items-center justify-center gap-3 text-sm fade-up"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <div className="accent-spinner" />
                  <span>Booting WebContainer…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
