import React, { useState, useEffect, useRef } from 'react';
import { Code as CodeIcon, Eye, RefreshCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { FileItem } from '../types/types';
import { PreviewFrame } from './Preview';
import { WebContainer } from '@webcontainer/api';

interface EditorPanelProps {
  webcontainer?: WebContainer;
  selectedFile: FileItem | null;
  editorContent: string;
  onEditorChange: (value: string | undefined) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  selectedFile, 
  editorContent, 
  onEditorChange,
  webcontainer
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [language, setLanguage] = useState('typescript');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set editor language based on file extension
  useEffect(() => {
    if (selectedFile?.path) {
      const extension = selectedFile.path.split('.').pop()?.toLowerCase();
      
      if (extension) {
        switch (extension) {
          case 'js':
            setLanguage('javascript');
            break;
          case 'jsx':
            setLanguage('javascript');
            break;
          case 'ts':
            setLanguage('typescript');
            break;
          case 'tsx':
            setLanguage('typescript');
            break;
          case 'css':
            setLanguage('css');
            break;
          case 'html':
            setLanguage('html');
            break;
          case 'json':
            setLanguage('json');
            break;
          default:
            setLanguage('typescript');
            break;
        }
      }
    }
  }, [selectedFile]);

  // Handle tab change
  const handleTabChange = (tab: 'code' | 'preview') => {
    setActiveTab(tab);
  };

  // Refresh the preview iframe
  const refreshPreview = () => {
    if (iframeRef.current && previewUrl) {
      // Force reload the iframe
      iframeRef.current.src = previewUrl;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => handleTabChange('code')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'code' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              <CodeIcon className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => handleTabChange('preview')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'preview' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'preview' && previewUrl && (
              <button 
                onClick={refreshPreview}
                className="p-2 rounded-lg hover:bg-gray-800"
                title="Refresh preview"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            {selectedFile && (
              <div className="text-sm text-gray-400">
                {selectedFile.path}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        {activeTab === 'code' ? (
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            value={editorContent}
            theme="vs-dark"
            onChange={onEditorChange}
            options={{
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              automaticLayout: true
            }}
          />
        ) : (
          <div className="bg-white rounded-lg h-full flex flex-col">
            <PreviewFrame webContainer={webcontainer as WebContainer} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel; 