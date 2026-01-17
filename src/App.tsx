import { useEffect } from 'react';
import { GraphCanvas } from './components/graph/GraphCanvas';
import { FileUpload } from './components/data-source/FileUpload';
import { UrlInput } from './components/data-source/UrlInput';
import { NodeDetailsPanel } from './components/panels/NodeDetailsPanel';
import { Sidebar } from './components/layout/Sidebar';
import { ExamplesDropdown } from './components/header/ExamplesDropdown';
import { useAppStore } from './stores/appStore';
import { useUIStore } from './stores/uiStore';
import { useApplyFilters } from './hooks/useFilters';
import { useApplyColorScheme } from './hooks/useColorScheme';
import { useApplyHighlights } from './hooks/useHighlights';
import { useApplyLayout } from './hooks/useLayout';
import { useApplyEdgeBundling } from './hooks/useEdgeBundling';

function App() {
  const graph = useAppStore((state) => state.graph);
  const stats = useAppStore((state) => state.stats);
  const error = useAppStore((state) => state.error);
  const clearData = useAppStore((state) => state.clearData);
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Apply filters, colors, highlights, layout, and edge bundling to graph
  useApplyFilters();
  useApplyColorScheme();
  useApplyHighlights();
  useApplyLayout();
  useApplyEdgeBundling();

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Please Build Graph Viewer</h1>
          <div className="flex items-center gap-4">
            {graph && (
              <div className="text-sm text-slate-500">
                {stats?.nodeCount} nodes &middot; {stats?.edgeCount} edges &middot;{' '}
                {stats?.packages} packages
              </div>
            )}
            <ExamplesDropdown />
            {graph && (
              <button
                onClick={clearData}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {!graph ? (
          // Data input view
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">Load a Graph</h2>
                <p className="text-slate-500 mt-1">
                  Upload a JSON file from <code className="text-sm bg-slate-100 px-1 rounded">plz query graph --output json</code>
                </p>
              </div>

              <FileUpload />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-50 text-slate-500">or load from URL</span>
                </div>
              </div>

              <UrlInput />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Graph view
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <GraphCanvas className="flex-1" />
            </div>
            {selectedNodeId && <NodeDetailsPanel />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
