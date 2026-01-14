import { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';
import { findShortestPath } from '../../lib/analysis/pathFinder';
import { findCycles } from '../../lib/analysis/cycleDetector';

export function AnalysisPanel() {
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

    const foundCycles = findCycles(graph);
    setCycles(foundCycles);

    if (foundCycles.length > 0) {
      // Highlight all nodes in cycles
      const cycleNodes = new Set<string>();
      foundCycles.forEach(cycle => cycle.forEach(node => cycleNodes.add(node)));
      highlightPath(Array.from(cycleNodes));
      setFocusedNode(foundCycles[0][0]);
    } else {
      highlightPath([]);
    }
  }, [graph, highlightPath, setFocusedNode]);

  return (
    <div className="p-3 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Analysis</h3>

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Find Path
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Source (e.g., //src:main)"
              value={sourceNode}
              onChange={(e) => setSourceNode(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Target (e.g., //lib:util)"
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleFindPath}
                disabled={!sourceNode || !targetNode}
                className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find Path
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {pathResult && (
          <div>
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Path ({pathResult.length} nodes)
            </h4>
            <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
              {pathResult.map((node, i) => (
                <li key={node} className="text-slate-600 truncate" title={node}>
                  {i + 1}. {node}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Cycle Detection
          </h4>
          <button
            onClick={handleDetectCycles}
            className="w-full px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Detect Cycles
          </button>

          {cycles !== null && (
            <div className="mt-2">
              {cycles.length === 0 ? (
                <p className="text-sm text-green-600">No cycles found</p>
              ) : (
                <div>
                  <p className="text-sm text-red-600 mb-1">
                    Found {cycles.length} cycle(s)
                  </p>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {cycles.map((cycle, i) => (
                      <li key={i} className="text-slate-600">
                        <span className="font-medium">Cycle {i + 1}:</span>{' '}
                        {cycle.length} nodes
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
