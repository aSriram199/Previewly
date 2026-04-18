import React from 'react';
import { Code2, Eye } from 'lucide-react';

interface TabViewProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
}

const TABS = [
  { id: 'code' as const, label: 'Code', icon: <Code2 className="w-3.5 h-3.5" /> },
  { id: 'preview' as const, label: 'Preview', icon: <Eye className="w-3.5 h-3.5" /> },
];

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5 mb-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}