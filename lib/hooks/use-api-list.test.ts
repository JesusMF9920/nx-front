// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApiList } from "./use-api-list";
import { ApiError } from "@/lib/api/errors";

type Item = { id: string; name: string };

const createFetcher = (delays: number[] = []) => {
  let callCount = 0;
  return vi.fn(async ({ skip, take, search }: { skip: number; take: number; search?: string }) => {
    const delay = delays[callCount] ?? 0;
    callCount += 1;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const all: Item[] = [
      { id: "1", name: "alpha" },
      { id: "2", name: "beta" },
      { id: "3", name: "gamma" },
      { id: "4", name: "delta" },
    ].filter((i) => !search || i.name.includes(search));
    return {
      items: all.slice(skip, skip + take),
      total: all.length,
    };
  });
};

describe("useApiList", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carga items iniciales paginados", async () => {
    const fetcher = createFetcher();
    const { result } = renderHook(() =>
      useApiList<Item>({ fetcher, pageSize: 2, errorMessage: "error" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith({ skip: 0, take: 2, search: undefined });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(4);
    expect(result.current.totalPages).toBe(2);
  });

  it("cambia de página y refetch", async () => {
    const fetcher = createFetcher();
    const { result } = renderHook(() =>
      useApiList<Item>({ fetcher, pageSize: 2, errorMessage: "error" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].id).toBe("1");

    act(() => result.current.setPage(2));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenLastCalledWith({ skip: 2, take: 2, search: undefined });
    expect(result.current.items[0].id).toBe("3");
  });

  it("debouncea la búsqueda y resetea a página 1", async () => {
    const fetcher = createFetcher();
    const { result, rerender } = renderHook(
      ({ search }) =>
        useApiList<Item>({ fetcher, pageSize: 2, errorMessage: "error", search }),
      { initialProps: { search: "" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender({ search: "alp" });

    act(() => vi.advanceTimersByTime(250));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenLastCalledWith({ skip: 0, take: 2, search: "alp" });
    expect(result.current.page).toBe(1);
  });

  it("descarta respuestas viejas (stale-guard)", async () => {
    // Primera llamada tarda, segunda es instantánea: la primera no debe pisar.
    const fetcher = createFetcher([100, 0]);
    const { result, rerender } = renderHook(
      ({ search }) =>
        useApiList<Item>({ fetcher, pageSize: 2, errorMessage: "error", search }),
      { initialProps: { search: "" } },
    );

    // Dispara búsqueda rápida antes de que termine la primera carga.
    rerender({ search: "al" });
    act(() => vi.advanceTimersByTime(250));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([{ id: "1", name: "alpha" }]);
  });

  it("expone el mensaje de error", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(500, "Backend failed"));
    const { result } = renderHook(() =>
      useApiList<Item>({ fetcher, pageSize: 2, errorMessage: "Network error" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Backend failed");
  });
});
