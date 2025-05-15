import React, { useState } from 'react';
import { Plus, Folder, File, ChevronRight } from 'lucide-react';
import { FileItem as FileItemType } from '../types/types';

interface FileExplorerProps {
  files: FileItemType[];
  onFileSelect: (file: FileItemType) => void;
  selectedFile: FileItemType | null;
}

interface ExpandedState {
  [key: string]: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, onFileSelect, selectedFile }) => {
  // Track expanded state of folders by their path
  const [expandedFolders, setExpandedFolders] = useState<ExpandedState>({});

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderFileTree = (items: FileItemType[], depth = 0) => {
    return items.map((item) => {
      const isFolder = item.type === 'folder';
      const isExpanded = isFolder && expandedFolders[item.path];
      
      return (
        <div key={item.path} className="mb-1">
          <div 
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm ${
              selectedFile?.path === item.path ? 'bg-gray-700' : 'hover:bg-gray-800'
            }`}
            style={{ paddingLeft: `${(depth * 12) + 8}px` }}
            onClick={() => isFolder ? toggleFolder(item.path) : onFileSelect(item)}
          >
            {isFolder && (
              <ChevronRight 
                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            )}
            {isFolder ? (
              <Folder className="w-4 h-4 text-blue-400" />
            ) : (
              <File className="w-4 h-4 text-gray-400" />
            )}
            <span>{item.name}</span>
          </div>
          
          {isFolder && item.children && isExpanded && (
            <div className="mt-1">
              {renderFileTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-[15%] border-r border-gray-800 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Files</h2>
        <button className="p-2 hover:bg-gray-800 rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {files.length > 0 ? renderFileTree(files) : (
          <div className="text-sm text-gray-500 p-2">No files available</div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer; 