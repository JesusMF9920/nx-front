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
    <div className="card" style={{ alignSelf: "start" }}>
      <div className="card__head">
        <div>
          <div className="card__title">{item.product}</div>
          <div className="card__sub">
            <span className="num">{item.id}</span> ·{" "}
            <span className="num" style={{ color: "var(--accent-ink)" }}>{item.order}</span> · {item.client}
          </div>
        </div>
        <div className="spacer" />
        <ApprovalPill s={item.status} />
        <button className="icon-btn" aria-label="Más acciones">{I.more}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px" }}>
        <div style={{ padding: 20, background: "var(--surface-2)", borderRight: "1px solid var(--line)" }}>
          <div
            className="skeleton-img"
            style={{
              height: 320,
              fontSize: 12,
              background: `radial-gradient(circle at 30% 30%, rgba(61,61,240,.18), transparent 50%),
                           repeating-linear-gradient(135deg, var(--surface), var(--surface) 12px, var(--surface-3) 12px, var(--surface-3) 24px)`,
            }}
          >
            preview · {item.product.toLowerCase()} · v{activeV}
          </div>

          <div style={{ display: "flex", marginTop: 12, alignItems: "center", gap: 8 }}>
            <button
              className="icon-btn"
              aria-label="Versión anterior"
              disabled={activeV <= 1}
              onClick={() => setActiveV((v) => Math.max(1, v - 1))}
            >
              {I.chevronLeft}
            </button>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
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

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--line)",
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Versiones ({item.version})
          </div>
          {versions.map((v) => (
            <div
              key={v.n}
              onClick={() => setActiveV(v.n)}
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: activeV === v.n ? "var(--surface-2)" : "transparent",
              }}
            >
              <div className="skeleton-img" style={{ width: 36, height: 36, fontSize: 9, flexShrink: 0 }}>
                v{v.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  v{v.n} · {fmtDate(v.date)}
                </div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {v.note}
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn--ghost btn--sm" style={{ margin: 10 }}>
            {I.upload} Subir nueva versión
          </button>
        </div>
      </div>

      <div className="divider" style={{ margin: 0 }} />
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Conversación</div>

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
          style={{
            marginTop: 14,
            padding: 10,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
          }}
        >
          <textarea
            className="textarea"
            rows={2}
            placeholder="Escribe una nota interna o respuesta al cliente…"
            style={{ background: "transparent", border: 0, padding: 0, width: "100%" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
            <span className="tag">@cliente</span>
            <span className="tag">Adjuntar</span>
            <div className="spacer" />
            <button className="btn btn--sm">{I.whatsapp} Enviar por WhatsApp</button>
            <button className="btn btn--accent btn--sm">{I.send} Comentar</button>
          </div>
        </div>

        {item.status !== "Aprobado" && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
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
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {system ? (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface-3)",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          N
        </div>
      ) : (
        <Avatar name={author} size={28} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12 }}>
          <strong>{author}</strong>
          {role && <span style={{ color: "var(--muted)" }}> · {role}</span>}
          <span style={{ color: "var(--muted-2)", marginLeft: 6 }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, marginTop: 2, color: system ? "var(--muted)" : "var(--ink-2)" }}>{text}</div>
      </div>
    </div>
  );
}
