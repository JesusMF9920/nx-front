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
    <div className="card" style={{ alignSelf: "start" }}>
      <div className="card__body" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Avatar name={client.name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.01em" }}>{client.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {client.type} · cliente desde {fmtDate("2024-08-12")}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {client.tags.length === 0 ? (
                <span className="tag" style={{ color: "var(--muted-2)" }}>sin etiquetas</span>
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

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DetailKV icon={I.phone} label="Teléfono" v={client.phone} />
          <DetailKV icon={I.mail}  label="Correo"   v={client.email} />
          <DetailKV icon={I.tag}   label="RFC"      v={client.rfc} />
          <DetailKV icon={I.user}  label="Contacto" v={client.contact} />
        </div>
      </div>

      <div className="divider" style={{ margin: 0 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", textAlign: "center" }}>
        <Mini label="Pedidos" v={client.orders} />
        <Mini label="Total histórico" v={fmtMXN(client.orders * 1820)} />
        <Mini
          label="Saldo actual"
          v={client.balance > 0 ? fmtMXN(client.balance) : "—"}
          tone={client.balance > 0 ? "danger" : undefined}
        />
      </div>

      <div className="divider" style={{ margin: 0 }} />

      <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                <div className="empty" style={{ border: 0, padding: 18 }}>Sin pedidos.</div>
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="num">{o.id}</td>
              <td><StatusPill s={o.status} /></td>
              <td className="num" style={{ textAlign: "right" }}>{fmtMXN(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailKV({ icon, label, v }: { icon: ReactNode; label: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13 }}>
      <span style={{ color: "var(--muted)", marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ color: "var(--muted)", fontSize: 11 }}>{label}</div>
        <div>{v}</div>
      </div>
    </div>
  );
}

function Mini({ label, v, tone }: { label: string; v: ReactNode; tone?: "danger" }) {
  return (
    <div style={{ padding: "12px 8px" }}>
      <div style={{ color: "var(--muted)", fontSize: 11 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: tone === "danger" ? "var(--danger)" : "var(--ink)",
        }}
      >
        {v}
      </div>
    </div>
  );
}
