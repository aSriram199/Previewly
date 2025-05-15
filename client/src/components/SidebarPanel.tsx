import React from 'react';
import ProgressPanel from './ProgressPanel/ProgressPanel';

interface SidebarPanelProps {
  prompt: string;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({ prompt }) => {
  return (
    <div className="w-1/4 border-r border-gray-800 p-4">
          <div className="mt-8 mb-8 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-md font-medium mb-2">Prompt:</h3>
      <p className="text-sm text-gray-300">{prompt}</p>
    </div>
      <ProgressPanel />
    </div>
  );
};

export default SidebarPanel; 