import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";
import { fmtDate, fmtMXN } from "@/lib/format";
import { NEXUM_ORDERS } from "@/lib/mock-orders";
import type { Client } from "@/lib/types";

export function ClientDetail({ client }: { client: Client }) {
  const orders = NEXUM_ORDERS.filter((o) => o.clientId === client.id);
  return (
    <div className="card self-start">
      <div className="card__body pb-0">
        <div className="flex gap-3.5 items-start">
          <Avatar name={client.name} size={48} />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold" style={{ letterSpacing: "-.01em" }}>
              {client.name}
            </div>
            <div className="text-muted text-xs">
              {client.type} · cliente desde {fmtDate("2024-08-12")}
            </div>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {client.tags.length === 0 ? (
                <span className="tag text-muted-2">sin etiquetas</span>
              ) : (
                client.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))
              )}
            </div>
          </div>
          <button className="icon-btn" aria-label="Más acciones">{I.more}</button>
        </div>

        <div className="divider" style={{ margin: "16px 0 12px" }} />

        <div className="grid grid-cols-2 gap-3">
          <DetailKV icon={I.phone} label="Teléfono" v={client.phone} />
          <DetailKV icon={I.mail}  label="Correo"   v={client.email} />
          <DetailKV icon={I.tag}   label="RFC"      v={client.rfc} />
          <DetailKV icon={I.user}  label="Contacto" v={client.contact} />
        </div>
      </div>

      <div className="divider m-0" />

      <div className="grid grid-cols-3 text-center">
        <Mini label="Pedidos" v={client.orders} />
        <Mini label="Total histórico" v={fmtMXN(client.orders * 1820)} />
        <Mini
          label="Saldo actual"
          v={client.balance > 0 ? fmtMXN(client.balance) : "—"}
          tone={client.balance > 0 ? "danger" : undefined}
        />
      </div>

      <div className="divider m-0" />

      <div className="px-4 py-3 flex gap-2 flex-wrap">
        <Link href="/pos" className="btn btn--accent btn--sm">
          {I.plus} Nueva venta
        </Link>
        <button className="btn btn--sm">{I.send} Enviar link de portal</button>
        <button className="btn btn--sm">{I.whatsapp} WhatsApp</button>
        <button className="btn btn--sm">{I.edit} Editar</button>
      </div>

      <div className="card__head" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="card__title">Pedidos del cliente</div>
        <div className="spacer" />
        <span className="card__sub">{orders.length}</span>
      </div>
      <table className="tbl">
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={3}>
                <div className="empty border-0 p-4">Sin pedidos.</div>
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="num">{o.id}</td>
              <td><StatusPill s={o.status} /></td>
              <td className="num text-right">{fmtMXN(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailKV({ icon, label, v }: { icon: ReactNode; label: string; v: ReactNode }) {
  return (
    <div className="flex gap-2 items-start text-[13px]">
      <span className="text-muted mt-0.5">{icon}</span>
      <div>
        <div className="text-muted text-[11px]">{label}</div>
        <div>{v}</div>
      </div>
    </div>
  );
}

function Mini({ label, v, tone }: { label: string; v: ReactNode; tone?: "danger" }) {
  return (
    <div className="px-2 py-3">
      <div className="text-muted text-[11px]">{label}</div>
      <div
        className="text-lg font-semibold"
        style={{
          fontVariantNumeric: "tabular-nums",
          color: tone === "danger" ? "var(--danger)" : "var(--ink)",
        }}
      >
        {v}
      </div>
    </div>
  );
}
