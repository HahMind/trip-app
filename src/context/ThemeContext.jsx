import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("tripTheme") || "pink",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tripTheme", theme);

    const themeColors = {
      dark: "#111827",
      pink: "#fec7d7",
      light: "#55423d",
      purple: "#faeee7",
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
