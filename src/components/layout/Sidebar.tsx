import { SearchPanel } from '../panels/SearchPanel';
import { FilterPanel } from '../panels/FilterPanel';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col overflow-hidden ${className}`}>
      <SearchPanel />
      <div className="flex-1 overflow-y-auto">
        <FilterPanel />
      </div>
    </aside>
  );
}
