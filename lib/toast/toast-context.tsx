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

import { I } from "@/components/icons";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  /** ms; 0 = no auto-cierra (queda hasta que el usuario lo descarta). */
  duration: number;
};

type ShowOpts = { kind?: ToastKind; duration?: number };

export type ToastApi = {
  /** Muestra un toast genérico (kind por defecto: "info"). Devuelve su id. */
  show: (message: string, opts?: ShowOpts) => number;
  success: (message: string, opts?: Omit<ShowOpts, "kind">) => number;
  error: (message: string, opts?: Omit<ShowOpts, "kind">) => number;
  info: (message: string, opts?: Omit<ShowOpts, "kind">) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  // Los errores se quedan más tiempo: el usuario suele necesitar leerlos.
  error: 6500,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, opts?: ShowOpts) => {
      const kind = opts?.kind ?? "info";
      const duration = opts?.duration ?? DEFAULT_DURATION[kind];
      const id = (idRef.current += 1);
      setToasts((list) => [...list, { id, kind, message, duration }]);
      if (duration > 0) {
        const tm = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, tm);
      }
      return id;
    },
    [dismiss],
  );

  // Limpia timers pendientes si el provider se desmonta (p.ej. logout total).
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const tm of map.values()) clearTimeout(tm);
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, o) => show(m, { ...o, kind: "success" }),
      error: (m, o) => show(m, { ...o, kind: "error" }),
      info: (m, o) => show(m, { ...o, kind: "info" }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Hook de acceso a los toasts. La API es estable entre renders, así que puede
 * usarse en deps de `useCallback`/`useEffect` sin causar re-ejecuciones.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  }
  return ctx;
}

const KIND_ICON: Record<ToastKind, ReactNode> = {
  success: I.check,
  error: I.alert,
  info: I.bell,
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  // El contenedor se renderiza siempre (aunque vacío) y es una live-region:
  // los lectores de pantalla anuncian los toasts que se agregan dentro.
  return (
    <div
      className="toast-viewport"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind}`}
          role={t.kind === "error" ? "alert" : "status"}
          aria-live={t.kind === "error" ? "assertive" : "polite"}
        >
          <span className="toast__icon" aria-hidden="true">
            {KIND_ICON[t.kind]}
          </span>
          <span className="toast__msg">{t.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(t.id)}
            aria-label="Cerrar notificación"
          >
            {I.x}
          </button>
        </div>
      ))}
    </div>
  );
}
