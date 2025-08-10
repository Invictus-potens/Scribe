"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    try {
      const root = document.documentElement;
      // Dark mode
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      // Accent theme
      root.classList.remove("theme-accent-orange");
      const savedAccent = localStorage.getItem("settings:accentTheme");
      if (savedAccent === "orange") {
        root.classList.add("theme-accent-orange");
      }
    } catch {}
  }, []);

  return null;
}


