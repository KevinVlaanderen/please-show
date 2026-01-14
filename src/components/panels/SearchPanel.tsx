import { useState, useCallback } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { useSearch } from '../../hooks/useSearch';
import { useUIStore } from '../../stores/uiStore';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const results = useSearch(query);
  const selectNode = useUIStore((state) => state.selectNode);
  const setFocusedNode = useUIStore((state) => state.setFocusedNode);

  const handleSelect = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setFocusedNode(nodeId); // Signal to camera to focus on this node
      setQuery('');
    },
    [selectNode, setFocusedNode]
  );

  return (
    <div className="p-3 border-b border-slate-200">
      <SearchInput
        placeholder="Search targets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
      />
      {results.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-slate-100">
          {results.map((result) => (
            <li key={result.id}>
              <button
                onClick={() => handleSelect(result.id)}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded"
              >
                <div className="text-sm font-medium text-slate-900 truncate">
                  {result.label}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {result.package || '(root)'}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
