import type { ReactNode } from "react";
import { I } from "@/components/icons";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import type { Purchase, PurchaseLine, PurchaseStatus } from "@/lib/types";

export function PurchaseDetail({ po }: { po: Purchase }) {
  return (
    <div className="card sticky top-4">
      <div className="card__head">
        <div>
          <div className="card__title num">{po.id}</div>
          <div className="text-muted text-xs">{po.supplier}</div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Descargar OC">{I.download}</button>
      </div>

      <div
        className="p-3.5 grid grid-cols-2 gap-2.5 text-xs"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <Kv k="Fecha" v={<span className="num">{po.date}</span>} />
        <Kv k="Esperada" v={<span className="num">{po.expected}</span>} />
        <Kv k="Comprador" v={po.buyer} />
        <Kv k="Total" v={<span className="num font-semibold">{fmtMXN(po.total)}</span>} />
      </div>

      <div className="p-3.5">
        <div className="label mb-2">Líneas</div>
        {po.lines.map((l, i) => (
          <PurchaseLineRow key={i} line={l} status={po.status} first={i === 0} />
        ))}
      </div>

      <div
        className="p-3 flex gap-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        {po.status === "Borrador" && (
          <button className="btn btn--primary flex-1 justify-center">
            {I.whatsapp} Enviar al proveedor
          </button>
        )}
        {(po.status === "Enviada" || po.status === "Recibida parcial") && (
          <button className="btn btn--accent flex-1 justify-center">
            {I.download} Recibir mercancía
          </button>
        )}
        {po.status === "Recibida" && (
          <button className="btn btn--ghost flex-1 justify-center">
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
    <div
      className="py-2.5"
      style={{ borderTop: first ? "none" : "1px solid var(--line)" }}
    >
      <div className="flex gap-2 items-baseline">
        <div className="flex-1 text-[13px]">{name}</div>
        <div className="num text-xs font-semibold">{fmtMXN(line.qty * line.cost)}</div>
      </div>
      <div className="flex gap-2 text-[11px] text-muted mt-0.5">
        <span className="num">{line.qty} {unit}</span>
        <span>·</span>
        <span className="num">{fmtMXN(line.cost)} c/u</span>
        <div className="spacer" />
        <span className="num" style={{ color: receivedColor }}>
          {received}/{line.qty} recibido
        </span>
      </div>
      <div
        className="bg-surface-3 mt-1 overflow-hidden"
        style={{ height: 4, borderRadius: 2 }}
      >
        <div className="h-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <div
        className="text-muted text-[10px] uppercase"
        style={{ letterSpacing: ".06em" }}
      >
        {k}
      </div>
      <div>{v}</div>
    </div>
  );
}
