// @vitest-environment happy-dom
// @vitest-environment-options { "url": "http://localhost:3000/pos" }
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { ApiError } from "./errors";
import { tokenStorage, type StoredTokens } from "@/lib/auth/tokens";

// tokenStorage mockeado con estado: write actualiza lo que read devuelve —
// el retry post-refresh debe firmar con el token NUEVO.
vi.mock("@/lib/auth/tokens", () => {
  let stored: StoredTokens | null = null;
  return {
    tokenStorage: {
      read: vi.fn(() => stored),
      write: vi.fn((t: StoredTokens) => {
        stored = t;
      }),
      clear: vi.fn(() => {
        stored = null;
      }),
    },
  };
});

const TOKENS: StoredTokens = {
  accessToken: "A1",
  refreshToken: "R1",
  accessExpiresAt: "2026-01-01T00:15:00Z",
  refreshExpiresAt: "2026-02-01T00:00:00Z",
};

const REFRESH_OK = {
  accessToken: "A2",
  refreshToken: "R2",
  accessExpiresAt: "2026-01-01T00:30:00Z",
  refreshExpiresAt: "2026-02-01T00:00:00Z",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  tokenStorage.clear();
  vi.mocked(tokenStorage.read).mockClear();
  vi.mocked(tokenStorage.write).mockClear();
  vi.mocked(tokenStorage.clear).mockClear();
  tokenStorage.write(TOKENS);
});

describe("apiFetch — camino feliz", () => {
  it("manda Authorization Bearer y parsea el JSON", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));

    const result = await apiFetch<{ ok: boolean }>("/orders");

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/orders");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer A1");
  });

  it("204 → undefined", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiFetch("/orders/x", { method: "PATCH" })).resolves
      .toBeUndefined();
  });

  it("auth:false no firma el request (página pública)", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));

    await apiFetch("/design/approvals/public/tok", {}, { auth: false });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });
});

describe("apiFetch — errores", () => {
  it("error no-401 → ApiError con status y body", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ message: "Stock insuficiente", error: "X" }, 409),
    );

    const err = await apiFetch("/pos/checkout", { method: "POST" }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe("Stock insuficiente");
    expect(fetchMock).toHaveBeenCalledTimes(1); // sin retry para no-401
  });
});

describe("apiFetch — flujo 401/refresh", () => {
  /** Router de fetch por URL: /auth/refresh responde distinto al resto. */
  const route = (handlers: {
    refresh: () => Response;
    other: (call: number) => Response;
  }) => {
    let otherCalls = 0;
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(handlers.refresh());
      }
      otherCalls += 1;
      return Promise.resolve(handlers.other(otherCalls));
    });
  };

  it("401 → refresh OK → retry exactamente una vez con el token nuevo", async () => {
    route({
      refresh: () => json(REFRESH_OK),
      other: (call) =>
        call === 1 ? json({ message: "expired" }, 401) : json({ ok: true }),
    });

    const result = await apiFetch<{ ok: boolean }>("/orders");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3); // orders(401) + refresh + orders(200)
    const lastInit = fetchMock.mock.calls[2][1];
    expect(new Headers(lastInit?.headers).get("Authorization")).toBe(
      "Bearer A2",
    );
    expect(tokenStorage.write).toHaveBeenCalledWith(REFRESH_OK);
  });

  it("401 → refresh falla → clear + redirect a /login + ApiError 401", async () => {
    route({
      refresh: () => json({ message: "nope" }, 401),
      other: () => json({ message: "expired" }, 401),
    });

    const err = await apiFetch("/orders").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(window.location.href).toContain("/login");
  });

  it("retry que vuelve a dar 401 NO entra en loop (un solo refresh)", async () => {
    let refreshCalls = 0;
    route({
      refresh: () => {
        refreshCalls += 1;
        return json(REFRESH_OK);
      },
      other: () => json({ message: "expired" }, 401),
    });

    const err = await apiFetch("/orders").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(refreshCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 401 + refresh + 401 final
  });

  it("dedupe: dos requests concurrentes con 401 comparten UN refresh", async () => {
    let refreshCalls = 0;
    let otherCalls = 0;
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        // Pequeña espera para que ambos 401 lleguen ANTES de resolver.
        await new Promise((r) => setTimeout(r, 10));
        return json(REFRESH_OK);
      }
      otherCalls += 1;
      return otherCalls <= 2
        ? json({ message: "expired" }, 401)
        : json({ ok: true });
    });

    const [a, b] = await Promise.all([
      apiFetch<{ ok: boolean }>("/orders"),
      apiFetch<{ ok: boolean }>("/quotes"),
    ]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCalls).toBe(1); // refreshInFlight dedupe
  });
});
