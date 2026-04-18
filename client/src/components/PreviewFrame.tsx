import { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import { type InstallStatus } from '../pages/Builder';

interface PreviewFrameProps {
  webContainer: WebContainer;
  installStatus: InstallStatus;
}

export function PreviewFrame({ webContainer, installStatus }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [devError, setDevError] = useState('');
  const devStarted = useRef(false);

  useEffect(() => {
    if (installStatus === 'installing') {
      devStarted.current = false;
      setUrl('');
      setDevError('');
    }
  }, [installStatus]);

  useEffect(() => {
    if (installStatus !== 'ready' || devStarted.current) return;
    devStarted.current = true;

    (async () => {
      try {
        const devProcess = await webContainer.spawn('npm', ['run', 'dev']);

        devProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              if (import.meta.env.DEV) console.log('[dev server]', chunk);
            },
          })
        );

        devProcess.exit.then((code) => {
          if (code !== 0) {
            setDevError(`Dev server exited unexpectedly (code ${code}). Check the console.`);
            devStarted.current = false;
          }
        });

        webContainer.on('server-ready', (_port, serverUrl) => {
          setUrl(serverUrl);
        });
      } catch (err) {
        console.error('[PreviewFrame] Failed to start dev server:', err);
        setDevError('Failed to start the preview server. Check the console.');
        devStarted.current = false;
      }
    })();
  }, [installStatus, webContainer]);

  if (devError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-sm" style={{ color: '#f87171' }}>{devError}</p>
        <button
          onClick={() => {
            setDevError('');
            devStarted.current = false;
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (installStatus === 'idle') {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-2"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="text-sm">Waiting for files to be generated…</span>
      </div>
    );
  }

  if (installStatus === 'error') {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-3 text-center px-6"
        style={{ color: '#f87171' }}
      >
        <p className="text-sm">Dependency installation failed.</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Check the browser console for details.
        </p>
      </div>
    );
  }

  if (installStatus === 'installing') {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-3 fade-up"
        style={{ color: 'var(--text-muted)' }}
      >
        <div className="accent-spinner" />
        <span className="text-sm">Installing dependencies…</span>
        <span className="text-xs" style={{ maxWidth: 240, textAlign: 'center' }}>
          This runs in the background — browse the code while you wait
        </span>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {!url && (
        <div
          className="h-full flex flex-col items-center justify-center gap-3 fade-up"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="accent-spinner" />
          <span className="text-sm">Starting dev server…</span>
        </div>
      )}
      {url && (
        <iframe
          width="100%"
          height="100%"
          src={url}
          style={{ border: 'none', borderRadius: 'var(--radius)', display: 'block' }}
          title="Live preview"
        />
      )}
    </div>
  );
}