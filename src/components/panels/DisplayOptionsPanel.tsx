import { useDisplayStore, type ColorScheme } from '../../stores/displayStore';
import { useLayoutStore, type ClusteringStrength, type LayoutQuality } from '../../stores/layoutStore';

const COLOR_SCHEMES: { value: ColorScheme; label: string; description: string }[] = [
  { value: 'package', label: 'By Package', description: 'Color nodes by their package path' },
  { value: 'label', label: 'By Label', description: 'Color nodes by their first label' },
  { value: 'binary', label: 'By Type', description: 'Highlight binary targets' },
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
  const clusterByPackage = useLayoutStore((state) => state.clusterByPackage);
  const setClusterByPackage = useLayoutStore((state) => state.setClusterByPackage);
  const clusteringStrength = useLayoutStore((state) => state.clusteringStrength);
  const setClusteringStrength = useLayoutStore((state) => state.setClusteringStrength);
  const hierarchicalLayout = useLayoutStore((state) => state.hierarchicalLayout);
  const setHierarchicalLayout = useLayoutStore((state) => state.setHierarchicalLayout);
  const showHulls = useLayoutStore((state) => state.showHulls);
  const setShowHulls = useLayoutStore((state) => state.setShowHulls);
  const layoutQuality = useLayoutStore((state) => state.layoutQuality);
  const setLayoutQuality = useLayoutStore((state) => state.setLayoutQuality);
  const dissuadeHubs = useLayoutStore((state) => state.dissuadeHubs);
  const setDissuadeHubs = useLayoutStore((state) => state.setDissuadeHubs);
  const edgeBundling = useLayoutStore((state) => state.edgeBundling);
  const setEdgeBundling = useLayoutStore((state) => state.setEdgeBundling);

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
          Layout
        </h4>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mb-2">
          <input
            type="checkbox"
            checked={clusterByPackage}
            onChange={(e) => setClusterByPackage(e.target.checked)}
            className="text-indigo-600 focus:ring-indigo-500 rounded"
          />
          <span className="text-sm text-slate-700">Cluster by package</span>
        </label>

        {clusterByPackage && (
          <div className="ml-6 space-y-1">
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
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-2">
              <input
                type="checkbox"
                checked={hierarchicalLayout}
                onChange={(e) => setHierarchicalLayout(e.target.checked)}
                className="text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <div>
                <span className="text-sm text-slate-700">Hierarchical nesting</span>
                <p className="text-xs text-slate-500">Sub-packages inside parents</p>
              </div>
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-2">
          <input
            type="checkbox"
            checked={showHulls}
            onChange={(e) => setShowHulls(e.target.checked)}
            className="text-indigo-600 focus:ring-indigo-500 rounded"
          />
          <span className="text-sm text-slate-700">Show cluster hulls</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-2">
          <input
            type="checkbox"
            checked={edgeBundling}
            onChange={(e) => setEdgeBundling(e.target.checked)}
            className="text-indigo-600 focus:ring-indigo-500 rounded"
          />
          <span className="text-sm text-slate-700">Curve edges</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-1 mt-2">
          <input
            type="checkbox"
            checked={dissuadeHubs}
            onChange={(e) => setDissuadeHubs(e.target.checked)}
            className="text-indigo-600 focus:ring-indigo-500 rounded"
          />
          <span className="text-sm text-slate-700">Spread out hubs</span>
        </label>

        <div className="mt-3">
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

      </div>
    </div>
  );
}
