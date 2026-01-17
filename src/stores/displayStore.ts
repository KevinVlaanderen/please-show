import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'package' | 'label' | 'binary';

interface DisplayState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      colorScheme: 'package',
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
    }),
    {
      name: 'please-show-display',
    }
  )
);
