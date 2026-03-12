import { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

interface PreviewFrameProps {
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const isRunning = useRef(false);

  useEffect(() => {
    // Guard: only start the dev server once, even if the component remounts
    if (isRunning.current) return;
    isRunning.current = true;

    async function startDevServer() {
      try {
        const installProcess = await webContainer.spawn('npm', ['install']);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              // Pipe npm install output to console in dev only
              if (import.meta.env.DEV) console.log('[PreviewFrame] install:', data);
            },
          })
        );

        // Wait for install to finish
        const exitCode = await installProcess.exit;
        if (exitCode !== 0) {
          setError('npm install failed. Check the console for details.');
          return;
        }

        await webContainer.spawn('npm', ['run', 'dev']);

        webContainer.on('server-ready', (_port, serverUrl) => {
          setUrl(serverUrl);
        });
      } catch (err) {
        console.error('[PreviewFrame] Failed to start dev server:', err);
        setError('Failed to start the preview server. Check the console.');
      }
    }

    startDevServer();
  }, [webContainer]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-center px-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && (
        <div className="text-center">
          <p className="mb-2">Starting preview server…</p>
        </div>
      )}
      {url && <iframe width="100%" height="100%" src={url} />}
    </div>
  );
}