import { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';

export function UrlInput() {
  const [url, setUrl] = useState('');
  const loadFromUrl = useAppStore((state) => state.loadFromUrl);
  const isLoading = useAppStore((state) => state.isLoading);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) {
        loadFromUrl(url.trim());
      }
    },
    [url, loadFromUrl]
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/graph.json"
        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'Load'}
      </button>
    </form>
  );
}
