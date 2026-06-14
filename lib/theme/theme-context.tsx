"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  readStoredPreference,
  resolveTheme,
  storePreference,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

type ThemeContextValue = {
  /** Lo que el usuario eligió: light | dark | system. */
  preference: ThemePreference;
  /** Lo que de hecho se pinta: light | dark (resuelve `system`). */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Estado inicial DETERMINISTA (igual en server y en el primer render del
  // cliente) para no romper la hidratación: el árbol se pinta igual en ambos.
  // El tema real ya lo aplicó el script anti-FOUC del <head>; aquí solo lo
  // sincronizamos con el estado de React tras montar.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);

  // Hidrata la preferencia real desde localStorage al montar. El setState aquí
  // es deliberado: el server no tiene localStorage, así que arrancamos en un
  // default determinista (igual server/cliente, sin mismatch) y sincronizamos
  // el valor real tras montar. No es el anti-patrón que la regla previene.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(readStoredPreference());
    setSystemDark(systemPrefersDark());
  }, []);

  // Sigue al SO en vivo; solo afecta cuando la preferencia es `system`.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(preference, systemDark);

  // Refleja el tema resuelto en el <html>. OMITE el primer run: en el commit
  // inicial `resolved` aún es el default ("light") y pisaría el valor correcto
  // que ya puso el script del <head> → flash. Tras hidratar, los cambios reales
  // sí se aplican.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return ctx;
}
