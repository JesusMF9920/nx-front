"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { QuoteStatusPill } from "@/components/quote-status-pill";
import { fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";
import { NEXUM_QUOTES } from "@/lib/mock-quotes";
import { NEXUM_USERS } from "@/lib/mock-users";
import type { Quote, QuoteStatus } from "@/lib/types";

type Tab = "Todas" | "Borradores" | "Enviadas" | "Aprobadas" | "Convertidas" | "Vencidas";

const TABS: Tab[] = ["Todas", "Borradores", "Enviadas", "Aprobadas", "Convertidas", "Vencidas"];

const TAB_STATUS: Record<Tab, QuoteStatus | null> = {
  Todas: null,
  Borradores: "Borrador",
  Enviadas: "Enviada",
  Aprobadas: "Aprobada",
  Convertidas: "Convertida",
  Vencidas: "Vencida",
};

const TODAY = new Date("2026-05-10");

export default function QuotesPage() {
  const [tab, setTab] = useState<Tab>("Todas");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    const status = TAB_STATUS[tab];
    return NEXUM_QUOTES.filter((q) => {
      if (status && q.status !== status) return false;
      if (search && !`${q.id} ${q.client}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tab, search]);

  const totalPipeline = NEXUM_QUOTES
    .filter((q) => q.status === "Enviada" || q.status === "Aprobada")
    .reduce((s, q) => s + q.total, 0);

  const conversion = Math.round(
    (100 * NEXUM_QUOTES.filter((q) => q.status === "Convertida").length) / NEXUM_QUOTES.length,
  );

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        sub={`${NEXUM_QUOTES.length} cotizaciones · ${fmtMXN(totalPipeline)} en pipeline · ${conversion}% conversión`}
        actions={
          <>
            <button className="btn">{I.download} Exportar</button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Nueva cotización
            </button>
          </>
        }
      />

      <div className="card">
        <div className="card__head" style={{ gap: 8 }}>
          <div className="topbar__search" style={{ margin: 0, width: 260 }}>
            {I.search}
            <input
              placeholder="Buscar folio o cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 4 }}>
            {TABS.map((t) => (
              <button
                key={t}
                className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Canal</th>
              <th style={{ textAlign: "right" }}>Items</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <QuoteRow key={q.id} q={q} />
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewQuoteModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function QuoteRow({ q }: { q: Quote }) {
  const due = new Date(q.validUntil);
  const daysLeft = Math.round((due.getTime() - TODAY.getTime()) / 86_400_000);
  const showCountdown = q.status !== "Convertida" && q.status !== "Rechazada";
  const orderRef = q.notes.startsWith("→") ? q.notes.replace("→ ", "").trim() : null;

  return (
    <tr>
      <td className="num" style={{ fontWeight: 500 }}>{q.id}</td>
      <td>{q.client}</td>
      <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{q.date}</td>
      <td style={{ fontSize: 12 }}>{q.seller}</td>
      <td><span className="tag" style={{ fontSize: 10 }}>{q.channel}</span></td>
      <td className="num" style={{ textAlign: "right" }}>{q.items}</td>
      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{fmtMXN(q.total)}</td>
      <td
        style={{
          fontSize: 11,
          color: daysLeft < 0 ? "var(--danger)" : daysLeft < 3 ? "var(--warn)" : "var(--muted)",
        }}
      >
        {q.validUntil}
        {showCountdown && (
          <div style={{ fontSize: 10 }}>
            {daysLeft < 0 ? `Vencida hace ${-daysLeft}d` : `${daysLeft}d restantes`}
          </div>
        )}
      </td>
      <td><QuoteStatusPill s={q.status} /></td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {q.status === "Aprobada" && (
          <Link href="/pos" className="btn btn--sm btn--primary">
            → Convertir
          </Link>
        )}
        {q.status === "Convertida" && orderRef && (
          <Link
            href={`/orders/${orderRef}`}
            className="num"
            style={{ fontSize: 11, color: "var(--accent-ink)" }}
          >
            {orderRef}
          </Link>
        )}
        {(q.status === "Enviada" || q.status === "Borrador") && (
          <button className="btn btn--sm" aria-label="Enviar por WhatsApp">{I.whatsapp}</button>
        )}
      </td>
    </tr>
  );
}

type DraftLine = {
  productId: string;
  qty: number;
  price: number;
  note: string;
};

function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<DraftLine[]>([
    { productId: NEXUM_PRODUCTS[0].id, qty: 100, price: NEXUM_PRODUCTS[0].price, note: "" },
  ]);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = subtotal * 0.16;
  const grand = subtotal + tax;

  const update = (i: number, p: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...p } : l)));

  const add = () =>
    setLines((ls) => [
      ...ls,
      { productId: NEXUM_PRODUCTS[0].id, qty: 1, price: NEXUM_PRODUCTS[0].price, note: "" },
    ]);

  const remove = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  return (
    <Modal
      title="Nueva cotización"
      onClose={onClose}
      width={860}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={onClose}>{I.copy} Guardar borrador</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.whatsapp} Enviar al cliente
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <label className="field">
          <span className="label">Cliente</span>
          <select className="input">
            {NEXUM_CLIENTS.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Vigencia</span>
          <input className="input" type="date" defaultValue="2026-05-25" />
        </label>
        <label className="field">
          <span className="label">Vendedor</span>
          <select className="input">
            {NEXUM_USERS.map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Producto</th>
              <th style={{ width: 80, textAlign: "right" }}>Cant.</th>
              <th style={{ width: 110, textAlign: "right" }}>Precio</th>
              <th style={{ width: 120, textAlign: "right" }}>Subtotal</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select
                    className="input"
                    style={{ width: "100%" }}
                    value={l.productId}
                    onChange={(e) => {
                      const p = NEXUM_PRODUCTS.find((x) => x.id === e.target.value);
                      update(i, { productId: e.target.value, price: p?.price ?? 0 });
                    }}
                  >
                    {NEXUM_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.qty}
                    onChange={(e) => update(i, { qty: parseInt(e.target.value || "0", 10) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.price}
                    onChange={(e) => update(i, { price: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(l.qty * l.price)}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => remove(i)} aria-label="Quitar línea">
                    {I.x}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--sm btn--ghost" onClick={add} style={{ marginTop: 10 }}>
        {I.plus} Agregar línea
      </button>

      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, fontSize: 13 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--muted)" }}>Subtotal</div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>IVA 16%</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Total
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num">{fmtMXN(subtotal)}</div>
          <div className="num" style={{ marginTop: 4 }}>{fmtMXN(tax)}</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {fmtMXN(grand)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
