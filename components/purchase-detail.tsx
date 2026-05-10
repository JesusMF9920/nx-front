import type { ReactNode } from "react";
import { I } from "@/components/icons";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import type { Purchase, PurchaseLine, PurchaseStatus } from "@/lib/types";

export function PurchaseDetail({ po }: { po: Purchase }) {
  return (
    <div className="card" style={{ position: "sticky", top: 16 }}>
      <div className="card__head">
        <div>
          <div className="card__title num">{po.id}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{po.supplier}</div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Descargar OC">{I.download}</button>
      </div>

      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          fontSize: 12,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Kv k="Fecha" v={<span className="num">{po.date}</span>} />
        <Kv k="Esperada" v={<span className="num">{po.expected}</span>} />
        <Kv k="Comprador" v={po.buyer} />
        <Kv k="Total" v={<span className="num" style={{ fontWeight: 600 }}>{fmtMXN(po.total)}</span>} />
      </div>

      <div style={{ padding: 14 }}>
        <div className="label" style={{ marginBottom: 8 }}>Líneas</div>
        {po.lines.map((l, i) => (
          <PurchaseLineRow key={i} line={l} status={po.status} first={i === 0} />
        ))}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
        {po.status === "Borrador" && (
          <button className="btn btn--primary" style={{ flex: 1, justifyContent: "center" }}>
            {I.whatsapp} Enviar al proveedor
          </button>
        )}
        {(po.status === "Enviada" || po.status === "Recibida parcial") && (
          <button className="btn btn--accent" style={{ flex: 1, justifyContent: "center" }}>
            {I.download} Recibir mercancía
          </button>
        )}
        {po.status === "Recibida" && (
          <button className="btn btn--ghost" style={{ flex: 1, justifyContent: "center" }}>
            {I.check} Cerrada
          </button>
        )}
      </div>
    </div>
  );
}

function PurchaseLineRow({
  line,
  status,
  first,
}: {
  line: PurchaseLine;
  status: PurchaseStatus;
  first: boolean;
}) {
  const mat = line.materialId ? NEXUM_MATERIALS.find((m) => m.id === line.materialId) : undefined;
  const name = mat?.name ?? line.name ?? "—";
  const unit = mat?.unit ?? "u";
  const received = line.received ?? (status === "Recibida" ? line.qty : 0);
  const pct = Math.round((received / line.qty) * 100);
  const barColor = pct === 100 ? "var(--ok)" : "var(--warn)";
  const receivedColor = pct === 100 ? "var(--ok)" : pct > 0 ? "var(--warn)" : "var(--muted)";

  return (
    <div style={{ padding: "10px 0", borderTop: first ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
        <div className="num" style={{ fontSize: 12, fontWeight: 600 }}>
          {fmtMXN(line.qty * line.cost)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
        <span className="num">{line.qty} {unit}</span>
        <span>·</span>
        <span className="num">{fmtMXN(line.cost)} c/u</span>
        <div className="spacer" />
        <span className="num" style={{ color: receivedColor }}>
          {received}/{line.qty} recibido
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--surface-3)",
          borderRadius: 2,
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <div
        style={{
          color: "var(--muted)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {k}
      </div>
      <div>{v}</div>
    </div>
  );
}
