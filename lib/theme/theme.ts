// Preferencia de tema (claro/oscuro/sistema). Lógica pura + acceso a
// localStorage; sin React. El backend NO participa: el tema es "chrome" de UI,
// no dato de negocio (ver plan Fase I.5), así que vive solo en el cliente.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Clave de localStorage. Mismo namespace que el token legacy (`nxpos.*`). */
export const THEME_STORAGE_KEY = "nxpos.theme";

const PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

/** ¿El valor es una preferencia válida? Defensa ante un localStorage corrupto. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    PREFERENCES.includes(value as ThemePreference)
  );
}

/**
 * Resuelve la preferencia al tema concreto a pintar. Pura y testeable: `system`
 * cae en lo que reporte el SO (`prefers-color-scheme`), que el caller pasa.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** Lee la preferencia guardada. SSR-safe; ausente o corrupta → `system`. */
export function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/** Persiste la preferencia. SSR-safe; ignora fallos (modo privado, cuota). */
export function storePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* best-effort */
  }
}

/** ¿El SO pide modo oscuro ahora mismo? SSR-safe. */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
