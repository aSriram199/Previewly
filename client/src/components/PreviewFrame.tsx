import { WebContainer } from '@webcontainer/api';
import  { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  // In a real implementation, this would compile and render the preview
  const [url, setUrl] = useState("");

  async function main() {
    console.log('[PreviewFrame] Bootstrapping dev server');
    const installProcess = await webContainer?.spawn('npm', ['install']);

    installProcess?.output.pipeTo(new WritableStream({
      write(data) {
        console.log(data);
      }
    }));

    console.log('[PreviewFrame] Starting dev server');
    await webContainer?.spawn('npm', ['run', 'dev']);

    // Wait for `server-ready` event
    webContainer?.on('server-ready', (port, url) => {
      // ...
      console.log('[PreviewFrame] server-ready url:', url)
      console.log('[PreviewFrame] server-ready port:', port)
      setUrl(url);
    });
  }

  useEffect(() => {
    main()
  }, [])
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && <div className="text-center">
        <p className="mb-2">Loading...</p>
      </div>}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
}