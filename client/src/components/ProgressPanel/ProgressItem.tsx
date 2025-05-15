import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProgressItemProps {
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
  description: string;
}

const ProgressItem: React.FC<ProgressItemProps> = ({ title, status, description }) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800">
      <CheckCircle2
        className={`w-5 h-5 mt-1 ${
          status === 'completed' ? 'text-green-500' :
          status === 'in-progress' ? 'text-blue-500' : 'text-gray-600'
        }`}
      />
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default ProgressItem; 