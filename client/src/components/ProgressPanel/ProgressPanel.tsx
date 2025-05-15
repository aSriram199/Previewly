import React from 'react';
import ProgressItem from './ProgressItem';

const ProgressPanel: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Generation Progress</h2>
      <div className="space-y-4">
        <div className="bg-gray-800 h-2 rounded-full mb-8">
          <div className="bg-blue-500 h-full w-3/4 rounded-full"></div>
        </div>
        
        <ProgressItem
          title="Project Setup"
          status="completed"
          description="Initializing project structure"
        />
        <ProgressItem
          title="Component Generation"
          status="in-progress"
          description="Creating React components"
        />
        <ProgressItem
          title="Styling"
          status="pending"
          description="Applying custom styles"
        />
      </div>
    </div>
  );
};

export default ProgressPanel; 