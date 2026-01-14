import { create } from 'zustand';

interface FilterState {
  // Excluded items (exclusion-based filtering)
  excludedPackages: string[];
  excludedLabels: string[];
  showBinaryOnly: boolean;

  // Actions
  setExcludedPackages: (packages: string[]) => void;
  togglePackage: (pkg: string) => void;
  setExcludedLabels: (labels: string[]) => void;
  toggleLabel: (label: string) => void;
  setShowBinaryOnly: (show: boolean) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  excludedPackages: [],
  excludedLabels: [],
  showBinaryOnly: false,

  setExcludedPackages: (packages) => set({ excludedPackages: packages }),

  togglePackage: (pkg) =>
    set((state) => ({
      excludedPackages: state.excludedPackages.includes(pkg)
        ? state.excludedPackages.filter((p) => p !== pkg)
        : [...state.excludedPackages, pkg],
    })),

  setExcludedLabels: (labels) => set({ excludedLabels: labels }),

  toggleLabel: (label) =>
    set((state) => ({
      excludedLabels: state.excludedLabels.includes(label)
        ? state.excludedLabels.filter((l) => l !== label)
        : [...state.excludedLabels, label],
    })),

  setShowBinaryOnly: (show) => set({ showBinaryOnly: show }),

  clearFilters: () =>
    set({
      excludedPackages: [],
      excludedLabels: [],
      showBinaryOnly: false,
    }),
}));
