"use client";

import { useEffect } from "react";

function resolveAppTheme() {
  const savedTheme = window.localStorage.getItem("birvana-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light";
}

function applySystemTheme() {
  const nextTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
}

export function PublicThemeSync() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applySystemTheme();

    applySystemTheme();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }

      document.documentElement.dataset.theme = resolveAppTheme();
    };
  }, []);

  return null;
}
