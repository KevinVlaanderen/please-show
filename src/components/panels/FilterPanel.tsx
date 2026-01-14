import { useAppStore } from '../../stores/appStore';
import { useFilterStore } from '../../stores/filterStore';

export function FilterPanel() {
  const packages = useAppStore((state) => state.packages);
  const labels = useAppStore((state) => state.labels);
  const {
    excludedPackages,
    excludedLabels,
    showBinaryOnly,
    togglePackage,
    toggleLabel,
    setShowBinaryOnly,
    clearFilters,
  } = useFilterStore();

  const hasFilters = excludedPackages.length > 0 || excludedLabels.length > 0 || showBinaryOnly;

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Binary filter */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showBinaryOnly}
          onChange={(e) => setShowBinaryOnly(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-slate-700">Binaries only</span>
      </label>

      {/* Package filter */}
      <FilterSection
        title="Packages"
        items={packages.map((p) => ({ id: p, label: p || '(root)' }))}
        excluded={excludedPackages}
        onToggle={togglePackage}
      />

      {/* Label filter */}
      {labels.length > 0 && (
        <FilterSection
          title="Labels"
          items={labels.map((l) => ({ id: l, label: l }))}
          excluded={excludedLabels}
          onToggle={toggleLabel}
        />
      )}
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  items: { id: string; label: string }[];
  excluded: string[];
  onToggle: (id: string) => void;
}

function FilterSection({ title, items, excluded, onToggle }: FilterSectionProps) {
  if (items.length === 0) return null;

  const hiddenCount = excluded.length;

  return (
    <div>
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
        {title}
        {hiddenCount > 0 && (
          <span className="ml-1 text-red-600">({hiddenCount} hidden)</span>
        )}
      </h4>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
          >
            <input
              type="checkbox"
              checked={!excluded.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 truncate" title={item.label}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
