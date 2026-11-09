export type AccentTheme = "grape" | "ocean" | "sunset" | "mint";

export interface ThemeOption {
  id: AccentTheme;
  name: string;
  primaryColor: string;
  accentColor: string;
  gradient: string;
}

export const ACCENT_THEMES: ThemeOption[] = [
  {
    id: "grape",
    name: "Grape",
    primaryColor: "#8B5CF6",
    accentColor: "#EC4899",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "ocean",
    name: "Ocean",
    primaryColor: "#0EA5E9",
    accentColor: "#06B6D4",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    id: "sunset",
    name: "Sunset",
    primaryColor: "#F97316",
    accentColor: "#EF4444",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "mint",
    name: "Mint",
    primaryColor: "#10B981",
    accentColor: "#14B8A6",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function applyTheme(accent: AccentTheme, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", accent);
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

