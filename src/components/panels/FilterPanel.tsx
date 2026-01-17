import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useFilterStore } from '../../stores/filterStore';
import {
  computeCheckboxState,
  handleToggle,
  type CheckboxState,
} from '../../lib/filters/checkboxState';

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
    disabledPackages,
    disabledLabels,
    showBinaryOnly,
    setDisabledPackages,
    setDisabledLabels,
    setShowBinaryOnly,
    clearFilters,
  } = useFilterStore();

  const hasFilters =
    disabledPackages.length > 0 || disabledLabels.length > 0 || showBinaryOnly;

  const packageTree = useMemo(() => buildTree(packages, '/'), [packages]);
  const labelTree = useMemo(() => buildTree(labels, ':'), [labels]);

  const handlePackageToggle = (
    path: string,
    state: CheckboxState,
    disabled: string[]
  ) => {
    const newDisabled = handleToggle(path, state, disabled, packages, '/');
    setDisabledPackages(newDisabled);
  };

  const handleLabelToggle = (
    path: string,
    state: CheckboxState,
    disabled: string[]
  ) => {
    const newDisabled = handleToggle(path, state, disabled, labels, ':');
    setDisabledLabels(newDisabled);
  };

  return (
    <div className="p-3 space-y-4">
      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Clear all
          </button>
        </div>
      )}

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
          {disabledPackages.length > 0 && (
            <span className="ml-1 text-red-600">
              ({disabledPackages.length} hidden)
            </span>
          )}
        </h4>
        <div className="max-h-60 overflow-y-auto">
          <HierarchicalTreeView
            node={packageTree}
            disabled={disabledPackages}
            allItems={packages}
            onToggle={handlePackageToggle}
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
            {disabledLabels.length > 0 && (
              <span className="ml-1 text-red-600">
                ({disabledLabels.length} hidden)
              </span>
            )}
          </h4>
          <div className="max-h-60 overflow-y-auto">
            <HierarchicalTreeView
              node={labelTree}
              disabled={disabledLabels}
              allItems={labels}
              onToggle={handleLabelToggle}
              separator=":"
              depth={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface TriStateCheckboxProps {
  state: CheckboxState;
  onChange: () => void;
}

function TriStateCheckbox({ state, onChange }: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'indeterminate';
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'checked'}
      onChange={onChange}
      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
  );
}

interface HierarchicalTreeViewProps {
  node: TreeNode;
  disabled: string[];
  allItems: string[];
  onToggle: (path: string, state: CheckboxState, disabled: string[]) => void;
  separator: string;
  depth: number;
}

function HierarchicalTreeView({
  node,
  disabled,
  allItems,
  onToggle,
  separator,
  depth,
}: HierarchicalTreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  // Compute root state
  const rootState = computeCheckboxState('', disabled, allItems, separator);

  return (
    <>
      {/* Render root item if it exists */}
      {depth === 0 && node.isLeaf && (
        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
          <TriStateCheckbox
            state={rootState}
            onChange={() => onToggle('', rootState, disabled)}
          />
          <span className="text-sm text-slate-700">(root)</span>
        </label>
      )}

      {/* Render children */}
      {sortedChildren.map((child) => {
        const hasChildren = child.children.size > 0;
        const isCollapsed = collapsed.has(child.fullPath);

        // Compute checkbox state for this node
        const checkboxState = computeCheckboxState(
          child.fullPath,
          disabled,
          allItems,
          separator
        );

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
              <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 flex-1">
                <TriStateCheckbox
                  state={checkboxState}
                  onChange={() => onToggle(child.fullPath, checkboxState, disabled)}
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
                disabled={disabled}
                allItems={allItems}
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
