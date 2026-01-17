import { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';
import { findShortestPath } from '../../lib/analysis/pathFinder';
import { findCycles } from '../../lib/analysis/cycleDetector';

export function AnalysisToolbar() {
  const graph = useAppStore((state) => state.graph);
  const highlightPath = useUIStore((state) => state.highlightPath);
  const clearHighlights = useUIStore((state) => state.clearHighlights);
  const setFocusedNode = useUIStore((state) => state.setFocusedNode);

  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [pathResult, setPathResult] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<string[][] | null>(null);

  const handleFindPath = useCallback(() => {
    if (!graph || !sourceNode || !targetNode) return;

    setError(null);
    setPathResult(null);
    setCycles(null);

    if (!graph.hasNode(sourceNode)) {
      setError(`Source node not found: ${sourceNode}`);
      return;
    }
    if (!graph.hasNode(targetNode)) {
      setError(`Target node not found: ${targetNode}`);
      return;
    }

    const path = findShortestPath(graph, sourceNode, targetNode);
    if (path) {
      setPathResult(path);
      highlightPath(path);
      setFocusedNode(sourceNode);
    } else {
      setError('No path found between these nodes');
      highlightPath([]);
    }
  }, [graph, sourceNode, targetNode, highlightPath, setFocusedNode]);

  const handleClear = useCallback(() => {
    setSourceNode('');
    setTargetNode('');
    setPathResult(null);
    setError(null);
    setCycles(null);
    clearHighlights();
  }, [clearHighlights]);

  const handleDetectCycles = useCallback(() => {
    if (!graph) return;

    setPathResult(null);
    setError(null);

    const foundCycles = findCycles(graph);
    setCycles(foundCycles);

    if (foundCycles.length > 0) {
      const cycleNodes = new Set<string>();
      foundCycles.forEach((cycle) => cycle.forEach((node) => cycleNodes.add(node)));
      highlightPath(Array.from(cycleNodes));
      setFocusedNode(foundCycles[0][0]);
    } else {
      highlightPath([]);
    }
  }, [graph, highlightPath, setFocusedNode]);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Path Finding */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Find Path
          </span>
          <input
            type="text"
            placeholder="Source"
            value={sourceNode}
            onChange={(e) => setSourceNode(e.target.value)}
            className="w-40 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-slate-400">→</span>
          <input
            type="text"
            placeholder="Target"
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            className="w-40 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleFindPath}
            disabled={!sourceNode || !targetNode}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Find
          </button>
        </div>

        {/* Cycle Detection */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Cycles
          </span>
          <button
            onClick={handleDetectCycles}
            className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Detect
          </button>
        </div>

        {/* Clear & Results */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
          >
            Clear
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
          {pathResult && (
            <span className="text-indigo-600">Path: {pathResult.length} nodes</span>
          )}
          {cycles !== null && (
            <span className={cycles.length === 0 ? 'text-green-600' : 'text-red-600'}>
              {cycles.length === 0 ? 'No cycles' : `${cycles.length} cycle(s)`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
