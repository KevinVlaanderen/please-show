import { create } from 'zustand';

interface FilterState {
  // Active filters
  selectedPackages: string[];
  selectedLabels: string[];
  showBinaryOnly: boolean;

  // Actions
  setSelectedPackages: (packages: string[]) => void;
  togglePackage: (pkg: string) => void;
  setSelectedLabels: (labels: string[]) => void;
  toggleLabel: (label: string) => void;
  setShowBinaryOnly: (show: boolean) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedPackages: [],
  selectedLabels: [],
  showBinaryOnly: false,

  setSelectedPackages: (packages) => set({ selectedPackages: packages }),

  togglePackage: (pkg) =>
    set((state) => ({
      selectedPackages: state.selectedPackages.includes(pkg)
        ? state.selectedPackages.filter((p) => p !== pkg)
        : [...state.selectedPackages, pkg],
    })),

  setSelectedLabels: (labels) => set({ selectedLabels: labels }),

  toggleLabel: (label) =>
    set((state) => ({
      selectedLabels: state.selectedLabels.includes(label)
        ? state.selectedLabels.filter((l) => l !== label)
        : [...state.selectedLabels, label],
    })),

  setShowBinaryOnly: (show) => set({ showBinaryOnly: show }),

  clearFilters: () =>
    set({
      selectedPackages: [],
      selectedLabels: [],
      showBinaryOnly: false,
    }),
}));
