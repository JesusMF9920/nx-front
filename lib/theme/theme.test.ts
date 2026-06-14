// @vitest-environment happy-dom
// @vitest-environment-options { "url": "http://localhost:3000" }
import { beforeEach, describe, expect, it } from "vitest";

import {
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  storePreference,
  THEME_STORAGE_KEY,
} from "./theme";

describe("resolveTheme", () => {
  it("light/dark explícitos ignoran al sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("`system` sigue al SO", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isThemePreference", () => {
  it("acepta solo los 3 valores válidos", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });

  it("rechaza basura, vacío y no-strings", () => {
    expect(isThemePreference("Dark")).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference(1)).toBe(false);
  });
});

// happy-dom 20 no expone `localStorage`, así que inyectamos un mock en memoria
// en `window` (que es lo que lee el código de producción).
function installMemoryLocalStorage(): void {
  let store: Record<string, string> = {};
  const mock: Storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: mock,
    configurable: true,
    writable: true,
  });
}

describe("readStoredPreference / storePreference", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it("sin valor guardado → system", () => {
    expect(readStoredPreference()).toBe("system");
  });

  it("valor corrupto → system (fail-safe)", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(readStoredPreference()).toBe("system");
  });

  it("round-trip: lo persistido se lee igual", () => {
    storePreference("dark");
    expect(readStoredPreference()).toBe("dark");
    storePreference("light");
    expect(readStoredPreference()).toBe("light");
    storePreference("system");
    expect(readStoredPreference()).toBe("system");
  });
});
