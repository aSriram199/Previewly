import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight } from 'lucide-react';
import { FileItem } from '../types';

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
}

interface FileNodeProps {
  item: FileItem;
  depth: number;
  onFileClick: (file: FileItem) => void;
}

function FileNode({ item, depth, onFileClick }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-xs transition-all duration-100"
        style={{
          paddingLeft: `${0.5 + depth * 1}rem`,
          color: 'var(--text-secondary)',
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)';
        }}
      >
        {item.type === 'folder' ? (
          <>
            <ChevronRight
              className="w-3 h-3 flex-shrink-0 transition-transform duration-150"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                color: 'var(--text-muted)',
              }}
            />
            {isExpanded
              ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            }
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          </>
        )}
        <span className="truncate">{item.name}</span>
      </div>

      {item.type === 'folder' && isExpanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({ files, onFileSelect }: FileExplorerProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden p-3">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-1"
        style={{ color: 'var(--text-muted)' }}>
        Files
      </p>
      <div className="flex-1 overflow-auto custom-scrollbar space-y-0.5">
        {files.map((file, index) => (
          <FileNode
            key={`${file.path}-${index}`}
            item={file}
            depth={0}
            onFileClick={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}