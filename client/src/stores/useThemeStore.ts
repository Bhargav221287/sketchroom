import { create } from "zustand";
import { AccentTheme, applyTheme } from "../design/themes.js";

interface ThemeState {
  accent: AccentTheme;
  isDark: boolean;
  colorBlindSafe: boolean;
  setAccent: (accent: AccentTheme) => void;
  toggleDarkMode: () => void;
  setColorBlindSafe: (enabled: boolean) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accent: (localStorage.getItem("sketchroom_theme") as AccentTheme) || "grape",
  isDark:
    localStorage.getItem("sketchroom_dark") !== null
      ? localStorage.getItem("sketchroom_dark") === "true"
      : window.matchMedia("(prefers-color-scheme: dark)").matches,
  colorBlindSafe: localStorage.getItem("sketchroom_colorblind") === "true",

  setAccent: (accent) => {
    localStorage.setItem("sketchroom_theme", accent);
    set({ accent });
    applyTheme(accent, get().isDark);
  },

  toggleDarkMode: () => {
    const nextDark = !get().isDark;
    localStorage.setItem("sketchroom_dark", String(nextDark));
    set({ isDark: nextDark });
    applyTheme(get().accent, nextDark);
  },

  setColorBlindSafe: (colorBlindSafe) => {
    localStorage.setItem("sketchroom_colorblind", String(colorBlindSafe));
    set({ colorBlindSafe });
  },

  initTheme: () => {
    const { accent, isDark } = get();
    applyTheme(accent, isDark);
  },
}));

