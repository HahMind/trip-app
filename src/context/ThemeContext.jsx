import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const LEGACY_THEME_MAP = {
  light: "brown",
  purple: "coral",
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("tripTheme") || "pink";
    return LEGACY_THEME_MAP[saved] || saved;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tripTheme", theme);

    const themeColors = {
      dark: "#111827",
      pink: "#fec7d7",
      brown: "#55423d",
      coral: "#faeee7",
    };
    const themeColor = themeColors[theme] || themeColors.dark;

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = themeColor;

    const statusBarMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (statusBarMeta) {
      statusBarMeta.content = theme === "dark" ? "black" : "default";
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
