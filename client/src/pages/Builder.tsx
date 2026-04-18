import { useEffect, useRef, useState } from 'react';
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
type InitPayload = { prompts: string[]; uiPrompts: string[]; response: string };
export type InstallStatus = 'idle' | 'installing' | 'ready' | 'error';

const pendingInitRequests = new Map<string, Promise<InitPayload>>();

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const msg =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : undefined;
    if (msg) return msg;
    if (error.response?.status === 404)
      return `The backend API route was not found at ${API_BASE_URL}. Start the server or update your API URL settings.`;
    if (error.code === 'ERR_NETWORK')
      return `Could not reach the backend at ${API_BASE_URL}. Start the server or update your API URL settings.`;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onDelta?: (accumulated: string) => void
): Promise<string> {
  const response = await fetch(buildApiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok || !response.body) {
    let errMsg = `Server error: ${response.status}`;
    try {
      const json = await response.json();
      if (json?.message) errMsg = json.message;
    } catch { /* swallow */ }
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(part.slice(6)) as
          | { delta: string }
          | { done: true; response: string }
          | { error: string };

        if ('error' in payload) throw new Error(payload.error);

        if ('done' in payload) {
          fullContent = payload.response;
        } else {
          fullContent += payload.delta;
          onDelta?.(fullContent);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
          throw parseErr;
        }
      }
    }
  }

  return fullContent;
}

async function loadBuilderInit(prompt: string): Promise<InitPayload> {
  const key = prompt.trim();
  const existing = pendingInitRequests.get(key);
  if (existing) return existing;

  const request = (async (): Promise<InitPayload> => {
    const templateResponse = await axios.post(buildApiUrl('/template'), { prompt: key });
    const { prompts, uiPrompts } = templateResponse.data as {
      prompts: string[];
      uiPrompts: string[];
    };

    const response = await streamChat(
      [...prompts, key].map((content) => ({ role: 'user', content }))
    );

    return { prompts, uiPrompts, response };
  })();

  pendingInitRequests.set(key, request);
  void request.finally(() => {
    if (pendingInitRequests.get(key) === request) pendingInitRequests.delete(key);
  });

  return request;
}

export function Builder() {
  const location = useLocation();
  const state = location.state as LocationState;

  if (!state?.prompt) return <Navigate to="/" replace />;

  const { prompt, prebuiltResponse } = state;

  const [userPrompt, setUserPrompt] = useState('');
  const [llmMessages, setLlmMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initAttempt, setInitAttempt] = useState(0);
  const [streamingText, setStreamingText] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const webcontainer = useWebContainer();
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
  const installTriggered = useRef(false);
  // path → content of files already written; only changed files are re-written to
  // avoid triggering unnecessary Vite HMR cycles that cause a mid-reload blank screen.
  const writtenFilesRef = useRef<Map<string, string>>(new Map());
  // content of package.json at the time of last npm install; used to detect
  // when a follow-up adds new dependencies and a re-install is required.
  const lastInstalledPkgJson = useRef<string | null>(null);

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

  useEffect(() => {
    if (!webcontainer || files.length === 0) return;

    const written = writtenFilesRef.current;

    const writeChangedFiles = async (items: FileItem[], basePath = '') => {
      for (const item of items) {
        const fullPath = `${basePath}/${item.name}`;
        if (item.type === 'folder') {
          await webcontainer.fs.mkdir(fullPath, { recursive: true }).catch(() => {});
          if (item.children) await writeChangedFiles(item.children, fullPath);
        } else {
          const newContent = item.content ?? '';
          if (written.get(fullPath) === newContent) continue;
          await webcontainer.fs.writeFile(fullPath, newContent);
          written.set(fullPath, newContent);
        }
      }
    };

    writeChangedFiles(files);
  }, [files, webcontainer]);

  const packageJsonFile = files.find((f) => f.type === 'file' && f.name === 'package.json');
  const packageJsonContent = packageJsonFile?.content ?? null;

  useEffect(() => {
    if (!webcontainer || !packageJsonContent) return;

    const isFirstInstall = !installTriggered.current;
    const pkgChanged =
      lastInstalledPkgJson.current !== null &&
      lastInstalledPkgJson.current !== packageJsonContent;

    if (!isFirstInstall && !pkgChanged) return;

    installTriggered.current = true;
    setInstallStatus('installing');

    const timer = setTimeout(async () => {
      try {
        const installProcess = await webcontainer.spawn('npm', ['install']);

        installProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              if (import.meta.env.DEV) console.log('[npm install]', chunk);
            },
          })
        );

        const exitCode = await installProcess.exit;
        if (exitCode === 0) {
          lastInstalledPkgJson.current = packageJsonContent;
          setInstallStatus('ready');
        } else {
          console.error(`[Builder] npm install exited with code ${exitCode}.`);
          setInstallStatus('error');
        }
      } catch (err) {
        console.error('[Builder] npm install failed:', err);
        setInstallStatus('error');
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcontainer, packageJsonContent]);

  useEffect(() => {
    installTriggered.current = false;
    lastInstalledPkgJson.current = null;
    writtenFilesRef.current = new Map();
    setInstallStatus('idle');
  }, [prompt]);

  async function handleSendMessage() {
    if (!userPrompt.trim() || prebuiltResponse) return;

    const newMessage: ChatMessage = { role: 'user', content: userPrompt };
    setErrorMessage('');
    setLoading(true);
    setStreamingText('');

    try {
      const fullContent = await streamChat(
        [...llmMessages, newMessage],
        (accumulated) => setStreamingText(accumulated)
      );

      setStreamingText('');
      const assistantMessage: ChatMessage = { role: 'assistant', content: fullContent };
      setLlmMessages((prev) => [...prev, newMessage, assistantMessage]);
      setUserPrompt('');

      setSteps((s) => {
        const highestId = s.reduce((max, step) => Math.max(max, step.id), 0);
        return [
          ...s,
          ...parseXml(fullContent).map((x, index) => ({
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
      setStreamingText('');
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
    setStreamingText('');
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
        setErrorMessage(getApiErrorMessage(error, 'Unable to initialize the builder right now.'));
      })
      .finally(() => {
        if (active) {
          setIsInitializing(false);
          setStreamingText('');
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
      <div className="ambient-orb ambient-orb-1" style={{ opacity: 0.4, top: '-5%', left: '-3%' }} />
      <div className="ambient-orb ambient-orb-2" style={{ opacity: 0.35 }} />

      <header
        className="flex items-center justify-between px-6 py-4 z-10 flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
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
              maxWidth: 360,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {prompt}
          </span>
        </div>

        {installStatus !== 'idle' && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-1 rounded-full"
            style={{
              background:
                installStatus === 'ready'
                  ? 'rgba(110,231,183,0.1)'
                  : installStatus === 'error'
                  ? 'rgba(239,68,68,0.1)'
                  : 'var(--bg-elevated)',
              color:
                installStatus === 'ready'
                  ? 'var(--accent)'
                  : installStatus === 'error'
                  ? '#f87171'
                  : 'var(--text-secondary)',
              border: `1px solid ${
                installStatus === 'ready'
                  ? 'rgba(110,231,183,0.2)'
                  : installStatus === 'error'
                  ? 'rgba(239,68,68,0.2)'
                  : 'var(--border-subtle)'
              }`,
            }}
          >
            {installStatus === 'installing' && (
              <span
                className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin"
                style={{ display: 'inline-block' }}
              />
            )}
            {installStatus === 'ready' && <span>●</span>}
            {installStatus === 'installing'
              ? 'Installing deps…'
              : installStatus === 'ready'
              ? 'Ready'
              : 'Install failed'}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-hidden z-10">
        <div
          className="h-full grid"
          style={{
            gridTemplateColumns: '280px 200px 1fr',
            gap: '1px',
            background: 'var(--border-subtle)',
          }}
        >
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

              {(isInitializing || loading) && streamingText && (
                <div
                  className="mt-4 rounded-lg px-3 py-2 text-xs leading-relaxed fade-up"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    maxHeight: 120,
                    overflow: 'hidden',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {streamingText.slice(-400)}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: '1em',
                      background: 'var(--accent)',
                      marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'pulseDot 0.8s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
            </div>

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

              {(isInitializing || loading) && !streamingText && <Loader />}
              {(isInitializing || loading) && streamingText && (
                <div className="flex items-center gap-2 py-2">
                  <div className="accent-spinner" style={{ width: 16, height: 16 }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Generating… {streamingText.length.toLocaleString()} chars
                  </span>
                </div>
              )}

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
                    disabled={!!prebuiltResponse || loading}
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
                    disabled={!!prebuiltResponse || !userPrompt.trim() || loading}
                    onClick={handleSendMessage}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: userPrompt.trim() && !loading ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: userPrompt.trim() && !loading ? '#0d0f12' : 'var(--text-muted)',
                      cursor: userPrompt.trim() && !loading ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Send <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </aside>

          <div className="overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
            <FileExplorer files={files} onFileSelect={setSelectedFile} />
          </div>

          <div className="flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            <div className="px-4 pt-4 flex-shrink-0">
              <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-4">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : webcontainer ? (
                <PreviewFrame webContainer={webcontainer} installStatus={installStatus} />
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
