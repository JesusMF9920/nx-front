"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ClientDetail } from "@/components/client-detail";
import { ClientNewForm } from "@/components/client-new-form";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { fmtDate, fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card">
          <div className="card__head gap-2">
            <div className="topbar__search m-0" style={{ width: 240 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, RFC, teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="row gap-1">
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
                <th className="text-right">Pedidos</th>
                <th className="text-right">Saldo</th>
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
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} size={26} />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-muted text-[11px]">
                          {c.type} · {c.rfc}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">{c.contact}</div>
                    <div className="text-muted text-[11px]">{c.phone}</div>
                  </td>
                  <td className="num text-right">{c.orders}</td>
                  <td
                    className="num text-right"
                    style={{ color: c.balance > 0 ? "var(--danger)" : "var(--muted)" }}
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
          <ClientNewForm />
        </Modal>
      )}
    </>
  );
}
