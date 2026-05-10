"use client";

import { useState, type ReactNode } from "react";
import { ApprovalPill } from "@/components/approval-pill";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { fmtDate } from "@/lib/format";
import type { Approval } from "@/lib/types";

const VERSION_DATES = ["2026-05-06", "2026-05-05", "2026-05-04", "2026-05-03"] as const;
const VERSION_NOTES = ["Versión actual", "Ajuste de espaciado", "Cambio de color", "Versión inicial"] as const;

export function ApprovalDetail({ item }: { item: Approval }) {
  const versions = Array.from({ length: item.version }, (_, i) => ({
    n: item.version - i,
    date: VERSION_DATES[i] ?? "2026-05-02",
    note: VERSION_NOTES[i] ?? "—",
  }));

  const [activeV, setActiveV] = useState(item.version);

  return (
    <div className="card self-start">
      <div className="card__head">
        <div>
          <div className="card__title">{item.product}</div>
          <div className="card__sub">
            <span className="num">{item.id}</span> ·{" "}
            <span className="num text-accent-ink">{item.order}</span> · {item.client}
          </div>
        </div>
        <div className="spacer" />
        <ApprovalPill s={item.status} />
        <button className="icon-btn" aria-label="Más acciones">{I.more}</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 220px" }}>
        <div
          className="p-5 bg-surface-2"
          style={{ borderRight: "1px solid var(--line)" }}
        >
          <div
            className="skeleton-img text-xs"
            style={{
              height: 320,
              background: `radial-gradient(circle at 30% 30%, rgba(61,61,240,.18), transparent 50%),
                           repeating-linear-gradient(135deg, var(--surface), var(--surface) 12px, var(--surface-3) 12px, var(--surface-3) 24px)`,
            }}
          >
            preview · {item.product.toLowerCase()} · v{activeV}
          </div>

          <div className="flex mt-3 items-center gap-2">
            <button
              className="icon-btn"
              aria-label="Versión anterior"
              disabled={activeV <= 1}
              onClick={() => setActiveV((v) => Math.max(1, v - 1))}
            >
              {I.chevronLeft}
            </button>
            <div className="text-xs text-muted font-mono">
              v{activeV} / v{item.version}
            </div>
            <button
              className="icon-btn"
              aria-label="Versión siguiente"
              disabled={activeV >= item.version}
              onClick={() => setActiveV((v) => Math.min(item.version, v + 1))}
            >
              {I.chevronRight}
            </button>
            <div className="spacer" />
            <button className="btn btn--sm">{I.download} Descargar</button>
            <button className="btn btn--sm">{I.copy} Copiar link</button>
          </div>
        </div>

        <div className="flex flex-col">
          <div
            className="px-3.5 py-2.5 text-[11px] text-muted uppercase"
            style={{
              borderBottom: "1px solid var(--line)",
              letterSpacing: ".06em",
            }}
          >
            Versiones ({item.version})
          </div>
          {versions.map((v) => (
            <div
              key={v.n}
              onClick={() => setActiveV(v.n)}
              className="px-3.5 py-2.5 cursor-pointer flex gap-2.5 items-center"
              style={{
                borderBottom: "1px solid var(--line)",
                background: activeV === v.n ? "var(--surface-2)" : "transparent",
              }}
            >
              <div className="skeleton-img text-[9px] shrink-0" style={{ width: 36, height: 36 }}>
                v{v.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">
                  v{v.n} · {fmtDate(v.date)}
                </div>
                <div className="text-muted text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {v.note}
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn--ghost btn--sm m-2.5">
            {I.upload} Subir nueva versión
          </button>
        </div>
      </div>

      <div className="divider m-0" />
      <div className="p-4">
        <div className="font-medium text-[13px] mb-2.5">Conversación</div>

        <CommentRow
          author="Sistema"
          time="hace 6 h"
          system
          text={
            <>
              Diseño v{item.version} enviado al cliente vía <span className="tag">{item.channel}</span>
            </>
          }
        />

        {item.note && <CommentRow author="Alma Reyes" role="Diseñadora" time="hace 6 h" text={item.note} />}

        {item.status === "Cambios solicitados" && (
          <CommentRow
            author={item.client}
            role="Cliente"
            time="hace 2 h"
            text="¿Podríamos cambiar la tipografía a algo más serio? Y subir un poco el logo."
          />
        )}

        <div
          className="mt-3.5 p-2.5 border border-line rounded-md bg-surface-2"
        >
          <textarea
            className="textarea w-full p-0 bg-transparent"
            rows={2}
            placeholder="Escribe una nota interna o respuesta al cliente…"
            style={{ border: 0 }}
          />
          <div className="flex gap-1.5 mt-2 items-center">
            <span className="tag">@cliente</span>
            <span className="tag">Adjuntar</span>
            <div className="spacer" />
            <button className="btn btn--sm">{I.whatsapp} Enviar por WhatsApp</button>
            <button className="btn btn--accent btn--sm">{I.send} Comentar</button>
          </div>
        </div>

        {item.status !== "Aprobado" && (
          <div
            className="mt-4 px-3.5 py-3 border border-line rounded-md bg-accent-soft flex items-center gap-2.5"
          >
            <div className="flex-1">
              <div style={{ fontWeight: 500, fontSize: 13, color: "var(--accent-ink)" }}>
                Aprobar manualmente
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Si el cliente confirmó por WhatsApp o teléfono, registra la aprobación tú mismo.
              </div>
            </div>
            <button className="btn btn--sm btn--danger">{I.x} Rechazar</button>
            <button className="btn btn--sm btn--accent">{I.check} Aprobar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentRow({
  author,
  role,
  time,
  text,
  system,
}: {
  author: string;
  role?: string;
  time: string;
  text: ReactNode;
  system?: boolean;
}) {
  return (
    <div className="flex gap-2.5 mb-3">
      {system ? (
        <div
          className="rounded-full bg-surface-3 grid place-items-center text-muted text-xs"
          style={{ width: 28, height: 28 }}
        >
          N
        </div>
      ) : (
        <Avatar name={author} size={28} />
      )}
      <div className="flex-1">
        <div className="text-xs">
          <strong>{author}</strong>
          {role && <span className="text-muted"> · {role}</span>}
          <span className="text-muted-2 ml-1.5">{time}</span>
        </div>
        <div
          className="text-[13px] mt-0.5"
          style={{ color: system ? "var(--muted)" : "var(--ink-2)" }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
