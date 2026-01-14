import { useDisplayStore, type ColorScheme } from '../../stores/displayStore';

const COLOR_SCHEMES: { value: ColorScheme; label: string; description: string }[] = [
  { value: 'package', label: 'By Package', description: 'Color nodes by their package path' },
  { value: 'label', label: 'By Label', description: 'Color nodes by their first label' },
  { value: 'binary', label: 'By Type', description: 'Highlight binary targets' },
];

export function DisplayOptionsPanel() {
  const colorScheme = useDisplayStore((state) => state.colorScheme);
  const setColorScheme = useDisplayStore((state) => state.setColorScheme);

  return (
    <div className="p-3 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Display</h3>

      <div>
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
    </div>
  );
}
