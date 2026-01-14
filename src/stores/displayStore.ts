import { create } from 'zustand';

export type ColorScheme = 'package' | 'label' | 'binary';

interface DisplayState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useDisplayStore = create<DisplayState>((set) => ({
  colorScheme: 'package',
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
}));
