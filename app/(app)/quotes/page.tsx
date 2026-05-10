"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { QuoteNewModal } from "@/components/quote-new-modal";
import { QuoteStatusPill } from "@/components/quote-status-pill";
import { fmtMXN } from "@/lib/format";
import { NEXUM_QUOTES } from "@/lib/mock-quotes";
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
        <div className="card__head gap-2">
          <div className="topbar__search m-0" style={{ width: 260 }}>
            {I.search}
            <input
              placeholder="Buscar folio o cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="row gap-1">
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
              <th className="text-right">Items</th>
              <th className="text-right">Total</th>
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

      {showNew && <QuoteNewModal onClose={() => setShowNew(false)} />}
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
      <td className="num font-medium">{q.id}</td>
      <td>{q.client}</td>
      <td className="num text-xs text-muted">{q.date}</td>
      <td className="text-xs">{q.seller}</td>
      <td><span className="tag text-[10px]">{q.channel}</span></td>
      <td className="num text-right">{q.items}</td>
      <td className="num text-right font-semibold">{fmtMXN(q.total)}</td>
      <td
        className="text-[11px]"
        style={{
          color: daysLeft < 0 ? "var(--danger)" : daysLeft < 3 ? "var(--warn)" : "var(--muted)",
        }}
      >
        {q.validUntil}
        {showCountdown && (
          <div className="text-[10px]">
            {daysLeft < 0 ? `Vencida hace ${-daysLeft}d` : `${daysLeft}d restantes`}
          </div>
        )}
      </td>
      <td><QuoteStatusPill s={q.status} /></td>
      <td className="text-right whitespace-nowrap">
        {q.status === "Aprobada" && (
          <Link href="/pos" className="btn btn--sm btn--primary">
            → Convertir
          </Link>
        )}
        {q.status === "Convertida" && orderRef && (
          <Link
            href={`/orders/${orderRef}`}
            className="num text-[11px] text-accent-ink"
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
