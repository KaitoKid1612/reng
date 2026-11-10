"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "reng-theme";
const THEME_CHANGE_EVENT = "reng-theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => "system");

  useEffect(() => {
    applyTheme(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getPreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, [preference]);

  function changeTheme(next: ThemePreference) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme remains usable even if browser storage is unavailable.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <label className="theme-selector">
      <span>Giao diện</span>
      <select
        aria-label="Chọn giao diện sáng, tối hoặc theo hệ thống"
        value={preference}
        onChange={(event) => changeTheme(event.target.value as ThemePreference)}
      >
        <option value="system">Theo máy</option>
        <option value="light">Sáng</option>
        <option value="dark">Tối</option>
      </select>
    </label>
  );
}
