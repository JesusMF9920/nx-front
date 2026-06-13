// @vitest-environment happy-dom
// @vitest-environment-options { "url": "http://localhost:3000/pos" }
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { ApiError } from "./errors";

// La sesión vive en cookies httpOnly (invisibles a JS): el front ya no lee ni
// firma tokens. Lo verificable es que cada request manda `credentials:"include"`
// (para que el navegador adjunte la cookie) y NO un header Authorization, y que
// el 401→refresh→retry y su dedupe siguen funcionando.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

describe("apiFetch — camino feliz", () => {
  it("manda credentials:include, sin Authorization, y parsea el JSON", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));

    const result = await apiFetch<{ ok: boolean }>("/orders");

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/orders");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("204 → undefined", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiFetch("/orders/x", { method: "PATCH" })).resolves
      .toBeUndefined();
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

  it("auth:false NO intenta refresh en 401 (página pública)", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "nope" }, 401));

    const err = await apiFetch("/design/approvals/public/tok", {}, { auth: false })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // ni refresh ni retry
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
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

  it("401 → refresh OK → retry exactamente una vez (bodyless, con cookie)", async () => {
    route({
      refresh: () => json({ ok: true }),
      other: (call) =>
        call === 1 ? json({ message: "expired" }, 401) : json({ ok: true }),
    });

    const result = await apiFetch<{ ok: boolean }>("/orders");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3); // orders(401) + refresh + orders(200)

    // El refresh es bodyless y manda la cookie (credentials:include).
    const refreshInit = fetchMock.mock.calls[1][1];
    expect(refreshInit?.method).toBe("POST");
    expect(refreshInit?.body).toBeUndefined();
    expect(refreshInit?.credentials).toBe("include");

    // El retry re-dispara el request original con credentials:include.
    const retryInit = fetchMock.mock.calls[2][1];
    expect(retryInit?.credentials).toBe("include");
    expect(new Headers(retryInit?.headers).has("Authorization")).toBe(false);
  });

  it("401 → refresh falla → redirect a /login + ApiError 401", async () => {
    route({
      refresh: () => json({ message: "nope" }, 401),
      other: () => json({ message: "expired" }, 401),
    });

    const err = await apiFetch("/orders").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(window.location.href).toContain("/login");
  });

  it("retry que vuelve a dar 401 NO entra en loop (un solo refresh)", async () => {
    let refreshCalls = 0;
    route({
      refresh: () => {
        refreshCalls += 1;
        return json({ ok: true });
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
        return json({ ok: true });
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
