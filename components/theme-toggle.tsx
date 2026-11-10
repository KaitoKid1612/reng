"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  isThemePreference,
  readThemePreference,
  saveThemePreference,
  THEME_CHANGE_EVENT,
  THEME_PREFERENCES,
} from "@/lib/theme";

import type { ThemePreference } from "@/lib/theme";
import type { ChangeEvent } from "react";

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Theo máy",
  light: "Sáng",
  dark: "Tối",
};

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

// The server cannot read the stored choice, so it renders the default and the browser corrects it.
function getServerPreference(): ThemePreference {
  return "system";
}

/** Light, dark or the device's setting, remembered in this browser. */
export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readThemePreference, getServerPreference);

  // "Theo máy" follows the device while the page stays open.
  useEffect(() => {
    applyTheme(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemChange() {
      if (readThemePreference() === "system") {
        applyTheme("system");
      }
    }
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, [preference]);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (isThemePreference(next)) {
      saveThemePreference(next);
    }
  }

  return (
    <label className="theme-selector">
      <span>Giao diện</span>
      <select value={preference} onChange={handleChange}>
        {THEME_PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {THEME_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
