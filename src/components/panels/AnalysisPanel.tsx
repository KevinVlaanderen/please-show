import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useUIStore } from '../../stores/uiStore';
import { findShortestPath, findAllPaths } from '../../lib/analysis/pathFinder';
import { findCycles } from '../../lib/analysis/cycleDetector';

export function AnalysisPanel() {
  const graph = useAppStore((state) => state.graph);
  const highlightPath = useUIStore((state) => state.highlightPath);
  const clearHighlights = useUIStore((state) => state.clearHighlights);
  const setFocusedNode = useUIStore((state) => state.setFocusedNode);
  const setPickingMode = useUIStore((state) => state.setPickingMode);
  const pickingMode = useUIStore((state) => state.pickingMode);
  const selectNode = useUIStore((state) => state.selectNode);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const inspectionMode = useUIStore((state) => state.inspectionMode);
  const setInspectionMode = useUIStore((state) => state.setInspectionMode);
  const inspectionTransitive = useUIStore((state) => state.inspectionTransitive);
  const setInspectionTransitive = useUIStore((state) => state.setInspectionTransitive);

  const [inspectedNode, setInspectedNode] = useState('');
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [pathResult, setPathResult] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<string[][] | null>(null);
  const [showAllPaths, setShowAllPaths] = useState(false);

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

    if (showAllPaths) {
      const paths = findAllPaths(graph, sourceNode, targetNode);
      if (paths.length > 0) {
        setPathResult(paths);
        // Collect all unique nodes from all paths
        const allNodes = new Set<string>();
        paths.forEach(path => path.forEach(node => allNodes.add(node)));
        highlightPath(Array.from(allNodes));
        // Clear node selection when finding a path
        selectNode(null);
      } else {
        setError('No paths found between these nodes');
        highlightPath([]);
      }
    } else {
      const path = findShortestPath(graph, sourceNode, targetNode);
      if (path) {
        setPathResult([path]);
        highlightPath(path);
        // Clear node selection when finding a path
        selectNode(null);
      } else {
        setError('No path found between these nodes');
        highlightPath([]);
      }
    }
  }, [graph, sourceNode, targetNode, showAllPaths, highlightPath, setFocusedNode, selectNode]);

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

  const handlePickSource = useCallback(() => {
    setPickingMode('source', (nodeId: string) => {
      setSourceNode(nodeId);
    });
  }, [setPickingMode]);

  const handlePickTarget = useCallback(() => {
    setPickingMode('target', (nodeId: string) => {
      setTargetNode(nodeId);
    });
  }, [setPickingMode]);

  const handlePickInspected = useCallback(() => {
    setPickingMode('inspect', (nodeId: string) => {
      setInspectedNode(nodeId);
      selectNode(nodeId);
    });
  }, [setPickingMode, selectNode]);

  const handleInspectedNodeChange = useCallback((value: string) => {
    setInspectedNode(value);
    if (value && graph?.hasNode(value)) {
      selectNode(value);
    } else if (!value) {
      selectNode(null);
    }
  }, [graph, selectNode]);

  const handleClearInspected = useCallback(() => {
    setInspectedNode('');
    selectNode(null);
  }, [selectNode]);

  // Sync inspectedNode with selectedNodeId (when clicking nodes on the graph)
  useEffect(() => {
    if (selectedNodeId !== null && selectedNodeId !== inspectedNode) {
      setInspectedNode(selectedNodeId);
    } else if (selectedNodeId === null && inspectedNode) {
      setInspectedNode('');
    }
  }, [selectedNodeId, inspectedNode]);

  // Automatically find path when both fields are filled or when showAllPaths changes
  useEffect(() => {
    if (graph && sourceNode && targetNode) {
      handleFindPath();
    }
  }, [graph, sourceNode, targetNode, showAllPaths, handleFindPath]);

  return (
    <div className="p-3">
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Inspect Node
          </h4>
          <div className="space-y-2">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Node (e.g., //src:main)"
                value={inspectedNode}
                onChange={(e) => handleInspectedNodeChange(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handlePickInspected}
                className={`px-2 py-1.5 border rounded hover:bg-slate-50 transition-colors ${
                  pickingMode === 'inspect'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300'
                }`}
                title="Pick node from graph"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <select
              value={inspectionMode}
              onChange={(e) => setInspectionMode(e.target.value as 'both' | 'dependencies' | 'dependents')}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="both">Both (dependencies + dependents)</option>
              <option value="dependencies">Dependencies only</option>
              <option value="dependents">Dependents only</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={inspectionTransitive}
                onChange={(e) => setInspectionTransitive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Show transitive dependencies</span>
            </label>
            <button
              onClick={handleClearInspected}
              className="w-full px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Find Path
          </h4>
          <div className="space-y-2">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Source (e.g., //src:main)"
                value={sourceNode}
                onChange={(e) => setSourceNode(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handlePickSource}
                className={`px-2 py-1.5 border rounded hover:bg-slate-50 transition-colors ${
                  pickingMode === 'source'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300'
                }`}
                title="Pick node from graph"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Target (e.g., //lib:util)"
                value={targetNode}
                onChange={(e) => setTargetNode(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handlePickTarget}
                className={`px-2 py-1.5 border rounded hover:bg-slate-50 transition-colors ${
                  pickingMode === 'target'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300'
                }`}
                title="Pick node from graph"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showAllPaths}
                onChange={(e) => setShowAllPaths(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Show all paths</span>
            </label>
            <button
              onClick={handleClear}
              className="w-full px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {pathResult && (
          <div>
            {pathResult.length === 1 ? (
              <>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Path ({pathResult[0].length} nodes)
                </h4>
                <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                  {pathResult[0].map((node, i) => (
                    <li key={node} className="text-slate-600 truncate" title={node}>
                      {i + 1}. {node}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Found {pathResult.length} paths
                </h4>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {pathResult.map((path, i) => (
                    <li key={i} className="text-slate-600">
                      <span className="font-medium">Path {i + 1}:</span> {path.length} nodes
                    </li>
                  ))}
                </ul>
              </>
            )}
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
