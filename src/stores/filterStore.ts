import { create } from 'zustand';

interface FilterState {
  // Excluded items (exclusion-based filtering)
  excludedPackages: string[];
  excludedLabels: string[];
  // Included packages override parent exclusions
  includedPackages: string[];
  includedLabels: string[];
  showBinaryOnly: boolean;

  // Actions
  setExcludedPackages: (packages: string[]) => void;
  togglePackage: (pkg: string) => void;
  togglePackageInclude: (pkg: string) => void;
  setExcludedLabels: (labels: string[]) => void;
  toggleLabel: (label: string) => void;
  toggleLabelInclude: (label: string) => void;
  setShowBinaryOnly: (show: boolean) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  excludedPackages: [],
  excludedLabels: [],
  includedPackages: [],
  includedLabels: [],
  showBinaryOnly: false,

  setExcludedPackages: (packages) => set({ excludedPackages: packages }),

  togglePackage: (pkg) =>
    set((state) => ({
      excludedPackages: state.excludedPackages.includes(pkg)
        ? state.excludedPackages.filter((p) => p !== pkg)
        : [...state.excludedPackages, pkg],
    })),

  togglePackageInclude: (pkg) =>
    set((state) => ({
      includedPackages: state.includedPackages.includes(pkg)
        ? state.includedPackages.filter((p) => p !== pkg)
        : [...state.includedPackages, pkg],
    })),

  setExcludedLabels: (labels) => set({ excludedLabels: labels }),

  toggleLabel: (label) =>
    set((state) => ({
      excludedLabels: state.excludedLabels.includes(label)
        ? state.excludedLabels.filter((l) => l !== label)
        : [...state.excludedLabels, label],
    })),

  toggleLabelInclude: (label) =>
    set((state) => ({
      includedLabels: state.includedLabels.includes(label)
        ? state.includedLabels.filter((l) => l !== label)
        : [...state.includedLabels, label],
    })),

  setShowBinaryOnly: (show) => set({ showBinaryOnly: show }),

  clearFilters: () =>
    set({
      excludedPackages: [],
      excludedLabels: [],
      includedPackages: [],
      includedLabels: [],
      showBinaryOnly: false,
    }),
}));
