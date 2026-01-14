import { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useFilterStore } from '../../stores/filterStore';

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  isLeaf: boolean; // true if this path is an actual item, not just an intermediate node
}

function buildTree(items: string[], separator: string): TreeNode {
  const root: TreeNode = {
    name: '',
    fullPath: '',
    children: new Map(),
    isLeaf: items.includes(''),
  };

  for (const item of items) {
    if (item === '') continue; // root handled separately

    const parts = item.split(separator);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const fullPath = parts.slice(0, i + 1).join(separator);

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath,
          children: new Map(),
          isLeaf: false,
        });
      }

      current = current.children.get(part)!;
    }

    current.isLeaf = true;
  }

  return root;
}

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

  const packageTree = useMemo(() => buildTree(packages, '/'), [packages]);
  const labelTree = useMemo(() => buildTree(labels, ':'), [labels]);

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

      {/* Package filter - hierarchical */}
      <div>
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          Packages
          {excludedPackages.length > 0 && (
            <span className="ml-1 text-red-600">({excludedPackages.length} hidden)</span>
          )}
        </h4>
        <div className="max-h-60 overflow-y-auto">
          <HierarchicalTreeView
            node={packageTree}
            excluded={excludedPackages}
            onToggle={togglePackage}
            separator="/"
            depth={0}
          />
        </div>
      </div>

      {/* Label filter - hierarchical */}
      {labels.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Labels
            {excludedLabels.length > 0 && (
              <span className="ml-1 text-red-600">({excludedLabels.length} hidden)</span>
            )}
          </h4>
          <div className="max-h-60 overflow-y-auto">
            <HierarchicalTreeView
              node={labelTree}
              excluded={excludedLabels}
              onToggle={toggleLabel}
              separator=":"
              depth={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface HierarchicalTreeViewProps {
  node: TreeNode;
  excluded: string[];
  onToggle: (item: string) => void;
  separator: string;
  depth: number;
}

function HierarchicalTreeView({ node, excluded, onToggle, separator, depth }: HierarchicalTreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isExcluded = (path: string) => excluded.includes(path);

  // Check if any ancestor is excluded (making this node effectively hidden)
  const isAncestorExcluded = (path: string) => {
    const parts = path.split(separator);
    for (let i = 1; i < parts.length; i++) {
      const ancestorPath = parts.slice(0, i).join(separator);
      if (excluded.includes(ancestorPath)) return true;
    }
    return false;
  };

  const toggleCollapse = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const sortedChildren = Array.from(node.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <>
      {/* Render root item if it exists */}
      {depth === 0 && node.isLeaf && (
        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
          <input
            type="checkbox"
            checked={!isExcluded('')}
            onChange={() => onToggle('')}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700">(root)</span>
        </label>
      )}

      {/* Render children */}
      {sortedChildren.map((child) => {
        const hasChildren = child.children.size > 0;
        const isCollapsed = collapsed.has(child.fullPath);
        const ancestorHidden = isAncestorExcluded(child.fullPath);

        return (
          <div key={child.fullPath} style={{ marginLeft: depth > 0 ? 12 : 0 }}>
            <div className="flex items-center gap-1">
              {/* Expand/collapse button */}
              {hasChildren ? (
                <button
                  onClick={() => toggleCollapse(child.fullPath)}
                  className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : (
                <span className="w-4" />
              )}

              {/* Checkbox and label */}
              <label
                className={`flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 flex-1 ${
                  ancestorHidden ? 'opacity-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={!isExcluded(child.fullPath) && !ancestorHidden}
                  onChange={() => onToggle(child.fullPath)}
                  disabled={ancestorHidden}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  {child.name}
                  {hasChildren && separator}
                </span>
              </label>
            </div>

            {/* Render children recursively */}
            {hasChildren && !isCollapsed && (
              <HierarchicalTreeView
                node={child}
                excluded={excluded}
                onToggle={onToggle}
                separator={separator}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

