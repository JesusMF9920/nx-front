"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { fmtDate, fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
import { NEXUM_ORDERS } from "@/lib/mock-orders";
import type { Client, ClientFilter } from "@/lib/types";

const FILTERS: ClientFilter[] = ["Todos", "Frecuentes", "Con crédito", "Saldo pendiente"];

function applyFilter(c: Client, f: ClientFilter): boolean {
  if (f === "Frecuentes") return c.tags.includes("Frecuente");
  if (f === "Con crédito") return c.tags.some((t) => t.startsWith("Crédito"));
  if (f === "Saldo pendiente") return c.balance > 0;
  return true;
}

export default function ClientsPage() {
  const [selected, setSelected] = useState<Client>(NEXUM_CLIENTS[3]);
  const [filter, setFilter] = useState<ClientFilter>("Todos");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return NEXUM_CLIENTS.filter((c) => applyFilter(c, filter)).filter((c) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.rfc.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const withBalance = NEXUM_CLIENTS.filter((c) => c.balance > 0).length;

  return (
    <>
      <PageHeader
        title="Clientes"
        sub={`${NEXUM_CLIENTS.length} clientes · ${withBalance} con saldo pendiente`}
        actions={
          <>
            <button className="btn">
              <span>{I.download}</span>Exportar
            </button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              <span>{I.plus}</span>Nuevo cliente
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card__head" style={{ gap: 8 }}>
            <div className="topbar__search" style={{ margin: 0, width: 240 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, RFC, teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="row" style={{ gap: 4 }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`btn btn--sm ${filter === f ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <button className="icon-btn" aria-label="Filtros">{I.filter}</button>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th style={{ textAlign: "right" }}>Pedidos</th>
                <th style={{ textAlign: "right" }}>Saldo</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{ background: selected.id === c.id ? "var(--surface-2)" : "" }}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={c.name} size={26} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>
                          {c.type} · {c.rfc}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{c.contact}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{c.phone}</div>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>{c.orders}</td>
                  <td
                    className="num"
                    style={{
                      textAlign: "right",
                      color: c.balance > 0 ? "var(--danger)" : "var(--muted)",
                    }}
                  >
                    {c.balance > 0 ? fmtMXN(c.balance) : "—"}
                  </td>
                  <td className="num">{fmtDate(c.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ClientDetail client={selected} />
      </div>

      {showNew && (
        <Modal
          title="Nuevo cliente"
          onClose={() => setShowNew(false)}
          width={680}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="btn btn--accent" onClick={() => setShowNew(false)}>
                Guardar cliente
              </button>
            </>
          }
        >
          <NewClientForm />
        </Modal>
      )}
    </>
  );
}

function ClientDetail({ client }: { client: Client }) {
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

function NewClientForm() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div className="field" style={{ gridColumn: "1/-1" }}>
        <span className="label">Tipo</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn--primary btn--sm">Negocio</button>
          <button type="button" className="btn btn--sm">Persona física</button>
        </div>
      </div>
      <div className="field">
        <span className="label">Razón social / Nombre</span>
        <input className="input" placeholder="Ej. Imprenta Río" />
      </div>
      <div className="field">
        <span className="label">RFC</span>
        <input className="input" placeholder="XXX0000000XX0" />
      </div>
      <div className="field">
        <span className="label">Persona de contacto</span>
        <input className="input" />
      </div>
      <div className="field">
        <span className="label">Teléfono</span>
        <input className="input" placeholder="55 0000 0000" />
      </div>
      <div className="field">
        <span className="label">Correo</span>
        <input className="input" placeholder="contacto@cliente.mx" />
      </div>
      <div className="field">
        <span className="label">Régimen fiscal</span>
        <select className="select">
          <option>601 — Régimen general</option>
          <option>612 — Persona física</option>
        </select>
      </div>
      <div className="field" style={{ gridColumn: "1/-1" }}>
        <span className="label">Notas internas</span>
        <textarea className="textarea" rows={3} placeholder="Preferencias, restricciones, contactos secundarios…" />
      </div>
      <div className="field" style={{ gridColumn: "1/-1" }}>
        <span className="label">Etiquetas</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Frecuente", "Mayoreo", "Crédito 15", "Crédito 30", "VIP", "Sin facturación"].map((t) => (
            <button type="button" key={t} className="btn btn--sm">{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
