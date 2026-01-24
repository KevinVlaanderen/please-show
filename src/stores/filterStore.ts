import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  // Disabled items (explicit disabled set model)
  disabledPackages: string[];
  disabledLabels: string[];
  showBinaryOnly: boolean;
  hideIsolatedNodes: boolean;

  // Actions
  setDisabledPackages: (packages: string[]) => void;
  setDisabledLabels: (labels: string[]) => void;
  setPackagesDisabled: (packages: string[], disabled: boolean) => void;
  setLabelsDisabled: (labels: string[], disabled: boolean) => void;
  setShowBinaryOnly: (show: boolean) => void;
  setHideIsolatedNodes: (hide: boolean) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      disabledPackages: [],
      disabledLabels: [],
      showBinaryOnly: false,
      hideIsolatedNodes: false,

  setDisabledPackages: (packages) => set({ disabledPackages: packages }),

  setDisabledLabels: (labels) => set({ disabledLabels: labels }),

  setPackagesDisabled: (packages, disabled) =>
    set((state) => {
      if (disabled) {
        // Add packages to disabled set
        return {
          disabledPackages: [...new Set([...state.disabledPackages, ...packages])],
        };
      } else {
        // Remove packages from disabled set
        const toRemove = new Set(packages);
        return {
          disabledPackages: state.disabledPackages.filter((p) => !toRemove.has(p)),
        };
      }
    }),

  setLabelsDisabled: (labels, disabled) =>
    set((state) => {
      if (disabled) {
        // Add labels to disabled set
        return {
          disabledLabels: [...new Set([...state.disabledLabels, ...labels])],
        };
      } else {
        // Remove labels from disabled set
        const toRemove = new Set(labels);
        return {
          disabledLabels: state.disabledLabels.filter((l) => !toRemove.has(l)),
        };
      }
    }),

  setShowBinaryOnly: (show) => set({ showBinaryOnly: show }),

  setHideIsolatedNodes: (hide) => set({ hideIsolatedNodes: hide }),

  clearFilters: () =>
    set({
      disabledPackages: [],
      disabledLabels: [],
      showBinaryOnly: false,
      hideIsolatedNodes: false,
    }),
    }),
    {
      name: 'please-show-filters',
      partialize: (state) => ({
        disabledPackages: state.disabledPackages,
        disabledLabels: state.disabledLabels,
        showBinaryOnly: state.showBinaryOnly,
        hideIsolatedNodes: state.hideIsolatedNodes,
      }),
    }
  )
);
