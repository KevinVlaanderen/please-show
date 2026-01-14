import { useDisplayStore, type ColorScheme } from '../../stores/displayStore';
import { useLayoutStore, type ClusteringStrength } from '../../stores/layoutStore';

const COLOR_SCHEMES: { value: ColorScheme; label: string; description: string }[] = [
  { value: 'package', label: 'By Package', description: 'Color nodes by their package path' },
  { value: 'label', label: 'By Label', description: 'Color nodes by their first label' },
  { value: 'binary', label: 'By Type', description: 'Highlight binary targets' },
];

const CLUSTERING_OPTIONS: { value: ClusteringStrength; label: string }[] = [
  { value: 'weak', label: 'Loose clustering' },
  { value: 'strong', label: 'Tight clustering' },
];

export function DisplayOptionsPanel() {
  const colorScheme = useDisplayStore((state) => state.colorScheme);
  const setColorScheme = useDisplayStore((state) => state.setColorScheme);
  const clusterByPackage = useLayoutStore((state) => state.clusterByPackage);
  const setClusterByPackage = useLayoutStore((state) => state.setClusterByPackage);
  const clusteringStrength = useLayoutStore((state) => state.clusteringStrength);
  const setClusteringStrength = useLayoutStore((state) => state.setClusteringStrength);
  const triggerRelayout = useLayoutStore((state) => state.triggerRelayout);

  return (
    <div className="p-3 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Display</h3>

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
          </div>
        )}

        <button
          onClick={triggerRelayout}
          className="mt-2 w-full px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"
        >
          Re-apply Layout
        </button>
      </div>
    </div>
  );
}
