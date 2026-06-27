"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import type { ApiOrderInternalNote } from "@/lib/api/types";
import { useToast } from "@/lib/toast/toast-context";

/** Fecha + hora corta para el hilo de notas (es-MX). */
function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Notas internas del equipo sobre un pedido (staff-only, append-only). Carga el
 * hilo y permite agregar una nota. Gateado fuera por sales.orders.read.
 */
export function OrderNotes({ orderId }: { orderId: string }) {
  const toast = useToast();
  const [notes, setNotes] = useState<ApiOrderInternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.listNotes(orderId);
      setNotes(res.items);
    } catch {
      /* el panel queda vacío si falla la carga */
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const add = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await ordersApi.addNote(orderId, text);
      setBody("");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo guardar la nota.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Notas internas</div>
        <span className="text-muted text-xs">{notes.length}</span>
      </div>
      <div className="card__body flex flex-col gap-3">
        {loading ? (
          <div className="text-muted text-sm">Cargando…</div>
        ) : notes.length === 0 ? (
          <div className="text-muted text-sm">
            Sin notas. Deja indicaciones internas para el equipo.
          </div>
        ) : (
          <ul className="flex flex-col gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {notes.map((n) => (
              <li
                key={n.id}
                style={{
                  borderLeft: "2px solid var(--line)",
                  paddingLeft: 10,
                }}
              >
                <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>
                  {n.body}
                </div>
                <div className="text-muted text-[11px]">
                  {n.authorName} · {fmtWhen(n.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            className="input"
            rows={2}
            placeholder="Escribe una nota para el equipo…"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <div className="spacer" />
            <button
              className="btn btn--sm btn--primary"
              type="button"
              disabled={saving || body.trim().length === 0}
              onClick={() => void add()}
            >
              {saving ? "Guardando…" : "Agregar nota"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
