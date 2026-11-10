"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  readThemePreference,
  saveThemePreference,
  THEME_CHANGE_EVENT,
} from "@/lib/theme";

import type { ThemePreference } from "@/lib/theme";
import type { LucideIcon } from "lucide-react";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  Icon: LucideIcon;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "system", label: "Theo máy", Icon: Monitor },
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
];

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

/** Three small buttons in the header: the device's setting, light or dark, remembered here. */
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

  return (
    <div className="theme-toggle">
      {/* Shown in the phone menu; on wide screens the icons and their tooltips are enough. */}
      <span id="theme-toggle-label" className="theme-toggle-label">
        Giao diện
      </span>
      <div className="theme-toggle-options" role="group" aria-labelledby="theme-toggle-label">
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
            aria-label={label}
            title={label}
            onClick={() => saveThemePreference(value)}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}
