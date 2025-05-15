import { useState, useEffect } from 'react';
import { usePrompt } from '../context/PromptContext';
import { useSteps } from '../hooks/useSteps';
import SidebarPanel from '../components/SidebarPanel';
import FileExplorer from '../components/FileExplorer';
import EditorPanel from '../components/EditorPanel';
import { FileItem } from '../types/types';
import { useWebContainer } from '../hooks/useWebContainer';
import { WebContainer } from '@webcontainer/api';
export default function Workspace() {


  const { prompt } = usePrompt();
  const { files } = useSteps(prompt);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const webcontainer = useWebContainer();
  // Handle file selection
  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
    if (file.content) {
      setEditorContent(file.content);
    } else {
      // Empty file or couldn't load content
      setEditorContent('');
    }
  };



  
  // Handle editor content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      
      // Update the file content if a file is selected
      if (selectedFile) {
        // This would ideally update the file content in your file structure
        // For now, it just updates the local state
        selectedFile.content = value;
      }
    }
  };

  // Set first file as selected on initial load or when files change
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      // Find the first actual file (not folder) to select
      const findFirstFile = (items: FileItem[]): FileItem | null => {
        for (const item of items) {
          if (item.type === 'file') {
            return item;
          } else if (item.children && item.children.length > 0) {
            const found = findFirstFile(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const firstFile = findFirstFile(files);
      if (firstFile) {
        handleFileSelect(firstFile);
      }
    }
  }, [files, selectedFile]);


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

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      <SidebarPanel prompt={prompt} />
      <FileExplorer 
        files={files} 
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
      />
      <EditorPanel
      webcontainer={webcontainer as WebContainer}
        selectedFile={selectedFile}
        editorContent={editorContent} 
        onEditorChange={handleEditorChange} 
      />
    </div>
  );
}