"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";

export type ApiListResult<T> = { items: T[]; total: number };

export type UseApiListOptions<T> = {
  /**
   * Hace la llamada paginada. Puede capturar filtros del componente (tab,
   * etc.) — el hook siempre usa la clausura MÁS RECIENTE vía ref, así que
   * basta declarar el cambio en `filterKey` para refetchear.
   */
  fetcher: (params: {
    skip: number;
    take: number;
    search?: string;
  }) => Promise<ApiListResult<T>>;
  /**
   * Huella de los filtros externos (p.ej. el tab activo). Cuando cambia, el
   * hook refetchea; el caller debe resetear la página a 1 junto con el filtro
   * (mismo contrato que tenían las páginas a mano).
   */
  filterKey?: string;
  /** Término de búsqueda CRUDO — el hook lo debouncea (250 ms) y resetea page. */
  search?: string;
  pageSize?: number;
  /** Mensaje para errores que no son ApiError (red caída, etc.). */
  errorMessage: string;
};

/**
 * Patrón compartido de listas paginadas server-side (generalización del de
 * purchases/page.tsx): debounce de búsqueda, paginación y stale-guard por
 * token incremental — una respuesta tardía jamás pisa datos más nuevos
 * (incluye Reintentar y reloads post-mutación).
 */
export function useApiList<T>({
  fetcher,
  filterKey = "",
  search = "",
  pageSize = 25,
  errorMessage,
}: UseApiListOptions<T>) {
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  // Mantiene la clausura más reciente sin escribir el ref durante render.
  // Declarado ANTES del effect de reload: los effects corren en orden de
  // declaración, así que reload siempre ve el fetcher fresco.
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Debounce de búsqueda: resetea page junto con el flush para que la
  // siguiente fetch sea atómica con el nuevo término.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const reload = useCallback(async () => {
    const myReq = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current({
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: debounced || undefined,
      });
      if (reqRef.current !== myReq) return; // respuesta vieja
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (reqRef.current !== myReq) return;
      setError(err instanceof ApiError ? err.message : errorMessage);
    } finally {
      if (reqRef.current === myReq) setLoading(false);
    }
    // filterKey es una huella externa a propósito: declara “los filtros del
    // caller cambiaron” sin exigirle memoizar objetos.
  }, [page, debounced, pageSize, errorMessage, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mismo patrón sancionado que orders/purchases
    void reload();
  }, [reload]);

  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    setPage,
    loading,
    error,
    /** Término efectivo (ya debounced) — útil para empty-states. */
    debounced,
    reload,
  };
}
