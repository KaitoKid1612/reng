import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

import { isThemePreference, THEME_SCRIPT, THEME_STORAGE_KEY } from "../lib/theme";

// Runs the inline script the root layout puts in <head>, with a stored choice and a device setting.
function themeBeforePaint(stored: string | null | Error, prefersDark: boolean) {
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  runInNewContext(THEME_SCRIPT, {
    document: { documentElement: root },
    localStorage: {
      getItem(key: string) {
        assert.equal(key, THEME_STORAGE_KEY);
        if (stored instanceof Error) {
          throw stored;
        }
        return stored;
      },
    },
    matchMedia: () => ({ matches: prefersDark }),
  });
  return { theme: root.dataset.theme, colorScheme: root.style.colorScheme };
}

test("the head script applies the stored theme, or the device's, before the first paint", () => {
  assert.deepEqual(themeBeforePaint("dark", false), { theme: "dark", colorScheme: "dark" });
  assert.deepEqual(themeBeforePaint("light", true), { theme: "light", colorScheme: "light" });
  assert.deepEqual(themeBeforePaint("system", true), { theme: "dark", colorScheme: "dark" });
  assert.deepEqual(themeBeforePaint(null, false), { theme: "light", colorScheme: "light" });
  assert.deepEqual(themeBeforePaint("purple", true), { theme: "dark", colorScheme: "dark" });
  assert.deepEqual(themeBeforePaint(new Error("blocked"), true), {
    theme: "light",
    colorScheme: "light",
  });
});

test("only the three theme choices are accepted from storage or the selector", () => {
  assert.deepEqual(["system", "light", "dark", "Dark", "", null].map(isThemePreference), [
    true,
    true,
    true,
    false,
    false,
    false,
  ]);
});
