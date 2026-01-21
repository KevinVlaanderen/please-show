import { useDisplayStore, type ColorScheme } from '../../stores/displayStore';
import { useLayoutStore, type LayoutAlgorithm, type LayoutQuality, type LayeredDirection, type LayeredSpacing, type ClusteringStrength } from '../../stores/layoutStore';
import { useUIStore } from '../../stores/uiStore';

const COLOR_SCHEMES: { value: ColorScheme; label: string; description: string }[] = [
  { value: 'package', label: 'By Package', description: 'Color nodes by their package path' },
  { value: 'label', label: 'By Label', description: 'Color nodes by their first label' },
  { value: 'binary', label: 'By Type', description: 'Highlight binary targets' },
];

const LAYOUT_ALGORITHMS: { value: LayoutAlgorithm; label: string; description: string }[] = [
  { value: 'forceAtlas2', label: 'Force-Directed', description: 'Basic force simulation' },
  { value: 'clusteredForceAtlas2', label: 'Clustered Force', description: 'Groups by package' },
  { value: 'hierarchical', label: 'Hierarchical', description: 'Nested treemap layout' },
  { value: 'layered', label: 'Layered (Sugiyama)', description: 'Minimizes edge crossings' },
  { value: 'radial', label: 'Radial', description: 'Concentric from center' },
  { value: 'circular', label: 'Circular', description: 'Nodes in a circle' },
];

const LAYERED_DIRECTIONS: { value: LayeredDirection; label: string }[] = [
  { value: 'LR', label: 'Left → Right' },
  { value: 'TB', label: 'Top → Bottom' },
  { value: 'RL', label: 'Right → Left' },
  { value: 'BT', label: 'Bottom → Top' },
];

const LAYERED_SPACING_OPTIONS: { value: LayeredSpacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'spacious', label: 'Spacious' },
];

const CLUSTERING_OPTIONS: { value: ClusteringStrength; label: string }[] = [
  { value: 'weak', label: 'Loose clustering' },
  { value: 'strong', label: 'Tight clustering' },
];

const LAYOUT_QUALITY_OPTIONS: { value: LayoutQuality; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'quality', label: 'High Quality' },
];

export function DisplayOptionsPanel() {
  const colorScheme = useDisplayStore((state) => state.colorScheme);
  const setColorScheme = useDisplayStore((state) => state.setColorScheme);

  const layoutAlgorithm = useLayoutStore((state) => state.layoutAlgorithm);
  const setLayoutAlgorithm = useLayoutStore((state) => state.setLayoutAlgorithm);
  const layeredDirection = useLayoutStore((state) => state.layeredDirection);
  const setLayeredDirection = useLayoutStore((state) => state.setLayeredDirection);
  const layeredSpacing = useLayoutStore((state) => state.layeredSpacing);
  const setLayeredSpacing = useLayoutStore((state) => state.setLayeredSpacing);
  const radialCenterNode = useLayoutStore((state) => state.radialCenterNode);
  const setRadialCenterNode = useLayoutStore((state) => state.setRadialCenterNode);
  const applyNoverlap = useLayoutStore((state) => state.applyNoverlap);
  const setApplyNoverlap = useLayoutStore((state) => state.setApplyNoverlap);
  const clusteringStrength = useLayoutStore((state) => state.clusteringStrength);
  const setClusteringStrength = useLayoutStore((state) => state.setClusteringStrength);
  const showHulls = useLayoutStore((state) => state.showHulls);
  const setShowHulls = useLayoutStore((state) => state.setShowHulls);
  const layoutQuality = useLayoutStore((state) => state.layoutQuality);
  const setLayoutQuality = useLayoutStore((state) => state.setLayoutQuality);
  const dissuadeHubs = useLayoutStore((state) => state.dissuadeHubs);
  const setDissuadeHubs = useLayoutStore((state) => state.setDissuadeHubs);
  const edgeBundling = useLayoutStore((state) => state.edgeBundling);
  const setEdgeBundling = useLayoutStore((state) => state.setEdgeBundling);
  const triggerRelayout = useLayoutStore((state) => state.triggerRelayout);

  const selectedNodeId = useUIStore((state) => state.selectedNodeId);

  const handleSetRadialCenter = () => {
    if (selectedNodeId) {
      setRadialCenterNode(selectedNodeId);
      setLayoutAlgorithm('radial');
      triggerRelayout();
    }
  };

  const showClusteringOptions = layoutAlgorithm === 'clusteredForceAtlas2';
  const showLayeredOptions = layoutAlgorithm === 'layered';
  const showRadialOptions = layoutAlgorithm === 'radial';
  const showForceOptions = ['forceAtlas2', 'clusteredForceAtlas2', 'hierarchical'].includes(layoutAlgorithm);

  return (
    <div className="p-3">
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          Color Scheme
        </h4>
        <div className="space-y-1">
          {COLOR_SCHEMES.map((scheme) => (
            <label
              key={scheme.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1"
            >
              <input
                type="radio"
                name="colorScheme"
                value={scheme.value}
                checked={colorScheme === scheme.value}
                onChange={() => setColorScheme(scheme.value)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm text-slate-700">{scheme.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          Layout Algorithm
        </h4>
        <select
          value={layoutAlgorithm}
          onChange={(e) => setLayoutAlgorithm(e.target.value as LayoutAlgorithm)}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          {LAYOUT_ALGORITHMS.map((algo) => (
            <option key={algo.value} value={algo.value}>
              {algo.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          {LAYOUT_ALGORITHMS.find((a) => a.value === layoutAlgorithm)?.description}
        </p>

        {/* Clustered layout options */}
        {showClusteringOptions && (
          <div className="ml-6 mt-2 space-y-1 border-l-2 border-slate-200 pl-3">
            {CLUSTERING_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1"
              >
                <input
                  type="radio"
                  name="clusteringStrength"
                  value={option.value}
                  checked={clusteringStrength === option.value}
                  onChange={() => setClusteringStrength(option.value)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Layered layout options */}
        {showLayeredOptions && (
          <div className="ml-6 mt-2 border-l-2 border-slate-200 pl-3">
            <label className="text-xs text-slate-500 block mb-1">Direction</label>
            <select
              value={layeredDirection}
              onChange={(e) => setLayeredDirection(e.target.value as LayeredDirection)}
              className="w-full text-sm border border-slate-300 rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {LAYERED_DIRECTIONS.map((dir) => (
                <option key={dir.value} value={dir.value}>
                  {dir.label}
                </option>
              ))}
            </select>
            <label className="text-xs text-slate-500 block mb-1 mt-3">Spacing</label>
            <div className="space-y-1">
              {LAYERED_SPACING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1"
                >
                  <input
                    type="radio"
                    name="layeredSpacing"
                    value={option.value}
                    checked={layeredSpacing === option.value}
                    onChange={() => setLayeredSpacing(option.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Radial layout options */}
        {showRadialOptions && (
          <div className="ml-6 mt-2 border-l-2 border-slate-200 pl-3">
            <div className="text-xs text-slate-500 mb-1">
              Center: {radialCenterNode ? (
                <span className="text-slate-700 font-mono">{radialCenterNode.split(':').pop()}</span>
              ) : (
                <span className="italic">auto (highest degree)</span>
              )}
            </div>
            <button
              onClick={handleSetRadialCenter}
              disabled={!selectedNodeId}
              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use selected node as center
            </button>
            {radialCenterNode && (
              <button
                onClick={() => { setRadialCenterNode(null); triggerRelayout(); }}
                className="text-xs px-2 py-1 ml-1 text-slate-600 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1">
            <input
              type="checkbox"
              checked={applyNoverlap}
              onChange={(e) => setApplyNoverlap(e.target.checked)}
              className="text-indigo-600 focus:ring-indigo-500 rounded"
            />
            <div>
              <span className="text-sm text-slate-700">Remove node overlaps</span>
              <p className="text-xs text-slate-500">Post-process to spread nodes apart</p>
            </div>
          </label>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Visual Options
          </h4>

          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1">
            <input
              type="checkbox"
              checked={showHulls}
              onChange={(e) => setShowHulls(e.target.checked)}
              className="text-indigo-600 focus:ring-indigo-500 rounded"
            />
            <span className="text-sm text-slate-700">Show cluster hulls</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-1">
            <input
              type="checkbox"
              checked={edgeBundling}
              onChange={(e) => setEdgeBundling(e.target.checked)}
              className="text-indigo-600 focus:ring-indigo-500 rounded"
            />
            <span className="text-sm text-slate-700">Curve edges</span>
          </label>

          {showForceOptions && (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-1">
              <input
                type="checkbox"
                checked={dissuadeHubs}
                onChange={(e) => setDissuadeHubs(e.target.checked)}
                className="text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <span className="text-sm text-slate-700">Spread out hubs</span>
            </label>
          )}
        </div>

        {showForceOptions && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Layout Quality
            </h4>
            <div className="space-y-1">
              {LAYOUT_QUALITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1"
                >
                  <input
                    type="radio"
                    name="layoutQuality"
                    value={option.value}
                    checked={layoutQuality === option.value}
                    onChange={() => setLayoutQuality(option.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
