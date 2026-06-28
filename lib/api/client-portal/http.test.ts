// @vitest-environment happy-dom
// @vitest-environment-options { "url": "http://localhost:3000/portal" }
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clientFetch } from "./http";
import { ApiError } from "../errors";

// El wrapper del portal tiene su propio ciclo de sesión: refresh a
// /portal/auth/refresh y, si falla, rebota a /portal/entrar (NO a /login).

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

const route = (handlers: {
  refresh: () => Response;
  other: (call: number) => Response;
}) => {
  let otherCalls = 0;
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/portal/auth/refresh")) {
      return Promise.resolve(handlers.refresh());
    }
    otherCalls += 1;
    return Promise.resolve(handlers.other(otherCalls));
  });
};

describe("clientFetch", () => {
  it("camino feliz: credentials:include y parsea JSON", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [], total: 0 }));
    const res = await clientFetch<{ total: number }>("/portal/orders");
    expect(res.total).toBe(0);
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("include");
  });

  it("auth:false NO intenta refresh en 401 (request-link/redeem)", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "no" }, 401));
    const err = await clientFetch(
      "/portal/auth/redeem",
      { method: "POST" },
      { auth: false },
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("401 → refresh OK al endpoint del PORTAL → retry una vez", async () => {
    route({
      refresh: () => json({ ok: true }),
      other: (call) =>
        call === 1 ? json({ message: "expired" }, 401) : json({ ok: true }),
    });

    const res = await clientFetch<{ ok: boolean }>("/portal/orders");
    expect(res).toEqual({ ok: true });
    // El refresh pegó a /portal/auth/refresh (no al de staff).
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/portal/auth/refresh",
    );
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
  });

  it("401 → refresh falla → rebota a /portal/entrar (no /login)", async () => {
    route({
      refresh: () => json({ message: "no" }, 401),
      other: () => json({ message: "expired" }, 401),
    });

    const err = await clientFetch("/portal/orders").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(window.location.href).toContain("/portal/entrar");
    expect(window.location.href).not.toContain("/login");
  });

  it("en /portal/entrar un 401 NO entra en loop de redirect", async () => {
    window.location.href = "http://localhost:3000/portal/entrar?token=x";
    route({
      refresh: () => json({ message: "no" }, 401),
      other: () => json({ message: "expired" }, 401),
    });

    await clientFetch("/portal/auth/me").catch(() => undefined);
    expect(window.location.pathname).toBe("/portal/entrar");
  });
});
