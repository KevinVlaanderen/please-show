import { useState } from 'react';
import { SearchPanel } from '../panels/SearchPanel';
import { FilterPanel } from '../panels/FilterPanel';
import { DisplayOptionsPanel } from '../panels/DisplayOptionsPanel';
import { AnalysisPanel } from '../panels/AnalysisPanel';

interface SidebarProps {
  className?: string;
}

type Tab = 'filters' | 'display' | 'analysis';

const TABS: { id: Tab; label: string }[] = [
  { id: 'filters', label: 'Filters' },
  { id: 'display', label: 'Display' },
  { id: 'analysis', label: 'Analysis' },
];

export function Sidebar({ className }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('filters');

  return (
    <aside className={`w-72 bg-white border-r border-slate-200 flex flex-col overflow-hidden ${className}`}>
      <SearchPanel />
      <div className="border-b border-slate-200">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className={activeTab === 'filters' ? '' : 'hidden'}>
          <FilterPanel />
        </div>
        <div className={activeTab === 'display' ? '' : 'hidden'}>
          <DisplayOptionsPanel />
        </div>
        <div className={activeTab === 'analysis' ? '' : 'hidden'}>
          <AnalysisPanel />
        </div>
      </div>
    </aside>
  );
}
