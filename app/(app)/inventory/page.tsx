"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { I } from "@/components/icons";
import { InventoryMaterialDetail } from "@/components/inventory-material-detail";
import { InventoryNewMaterialModal } from "@/components/inventory-new-material-modal";
import { InventoryStockAdjustModal } from "@/components/inventory-stock-adjust-modal";
import { InventoryStockEntryModal } from "@/components/inventory-stock-entry-modal";
import { PageHeader } from "@/components/page-header";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_STOCK_MOVES } from "@/lib/mock-stock-moves";
import type { Material } from "@/lib/types";

const SPECIAL_FILTER = "Bajo stock" as const;

type Tone = "neutral" | "info" | "warn" | "danger";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--ink)",
  info: "var(--info)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export default function InventoryPage() {
  const [filter, setFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(NEXUM_MATERIALS[0].id);
  const [showEntry, setShowEntry] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(NEXUM_MATERIALS.map((m) => m.category)))],
    [],
  );

  const filtered = useMemo(() => {
    return NEXUM_MATERIALS.filter((m) => {
      if (search && !`${m.name} ${m.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === SPECIAL_FILTER) return m.stock <= m.reorder;
      if (filter !== "Todos") return m.category === filter;
      return true;
    });
  }, [filter, search]);

  const selected: Material =
    NEXUM_MATERIALS.find((m) => m.id === selectedId) ?? NEXUM_MATERIALS[0];

  const totalValue = NEXUM_MATERIALS.reduce((s, m) => s + m.stock * m.cost, 0);
  const lowStockCount = NEXUM_MATERIALS.filter((m) => m.stock <= m.reorder).length;
  const criticalCount = NEXUM_MATERIALS.filter((m) => m.stock <= m.reorder * 0.5).length;

  return (
    <>
      <PageHeader
        title="Inventario"
        sub={`${NEXUM_MATERIALS.length} insumos · ${lowStockCount} bajo stock · ${fmtMXN(totalValue)} valor en almacén`}
        actions={
          <>
            <button className="btn" onClick={() => setShowAdjust(true)}>
              {I.edit} Ajuste
            </button>
            <button className="btn" onClick={() => setShowEntry(true)}>
              {I.download} Entrada de mercancía
            </button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Nuevo insumo
            </button>
          </>
        }
      />

      <div className="grid gap-3.5 mb-[18px]" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <KpiCard
          label="Insumos activos"
          value={NEXUM_MATERIALS.length}
          sub="categorías: textil, tinta, papel, vinil"
          tone="neutral"
        />
        <KpiCard
          label="Valor en almacén"
          value={fmtMXN(totalValue)}
          sub="al costo, sin IVA"
          tone="info"
        />
        <KpiCard
          label="Bajo stock"
          value={lowStockCount}
          sub="por debajo del punto de reorden"
          tone="warn"
          icon={I.alert}
        />
        <KpiCard
          label="Críticos"
          value={criticalCount}
          sub="< 50% del reorden"
          tone="danger"
          icon={I.alert}
        />
      </div>

      <div className="grid gap-[18px] items-start" style={{ gridTemplateColumns: "1fr 380px" }}>
        <div className="card">
          <div className="card__head gap-2">
            <div className="topbar__search m-0" style={{ width: 260 }}>
              {I.search}
              <input
                placeholder="Buscar insumo o SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="row gap-1 flex-wrap">
              {[...categories, SPECIAL_FILTER].map((f) => (
                <button
                  key={f}
                  className={`btn btn--sm ${filter === f ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setFilter(f)}
                >
                  {f === SPECIAL_FILTER ? (
                    <>
                      {I.alert} {f}
                    </>
                  ) : (
                    f
                  )}
                </button>
              ))}
            </div>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoría</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Reorden</th>
                <th>Estado</th>
                <th className="text-right">Costo unit.</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isLow = m.stock <= m.reorder;
                const isCritical = m.stock <= m.reorder * 0.5;
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    style={{ background: selected.id === m.id ? "var(--accent-soft)" : "" }}
                  >
                    <td>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-muted font-mono text-[11px]">{m.sku}</div>
                    </td>
                    <td>
                      <span className="pill pill--neutral">{m.category}</span>
                    </td>
                    <td className="num text-right font-semibold">
                      {m.stock}{" "}
                      <span className="text-muted font-normal text-[11px]">{m.unit}</span>
                    </td>
                    <td className="num text-right text-muted">{m.reorder}</td>
                    <td>
                      {isCritical ? (
                        <span className="pill pill--danger">{I.alert} Crítico</span>
                      ) : isLow ? (
                        <span className="pill pill--warn">Reordenar</span>
                      ) : (
                        <span className="pill pill--ok">{I.check} OK</span>
                      )}
                    </td>
                    <td className="num text-right">{fmtMXN(m.cost)}</td>
                    <td className="num text-right font-semibold">{fmtMXN(m.stock * m.cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <InventoryMaterialDetail material={selected} />
      </div>

      <div className="card mt-[18px]">
        <div className="card__head">
          <div className="card__title">Movimientos recientes</div>
          <div className="spacer" />
          <button className="btn btn--sm btn--ghost">Ver todos</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Insumo</th>
              <th className="text-right">Cantidad</th>
              <th>Referencia</th>
              <th>Nota</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {NEXUM_STOCK_MOVES.map((mv) => {
              const mat = NEXUM_MATERIALS.find((m) => m.id === mv.materialId);
              return (
                <tr key={mv.id}>
                  <td className="num text-[11px] text-muted">{mv.date}</td>
                  <td>
                    {mv.type === "entrada" && <span className="pill pill--ok">↓ Entrada</span>}
                    {mv.type === "salida" && <span className="pill pill--info">↑ Salida</span>}
                    {mv.type === "ajuste" && <span className="pill pill--warn">± Ajuste</span>}
                  </td>
                  <td>{mat?.name ?? mv.materialId}</td>
                  <td
                    className="num text-right font-semibold"
                    style={{ color: mv.qty > 0 ? "var(--ok)" : "var(--danger)" }}
                  >
                    {mv.qty > 0 ? "+" : ""}
                    {mv.qty}{" "}
                    <span className="text-muted font-normal text-[11px]">{mat?.unit}</span>
                  </td>
                  <td>
                    {mv.ref.startsWith("ORD") ? (
                      <Link className="num text-accent-ink" href={`/orders/${mv.ref}`}>
                        {mv.ref}
                      </Link>
                    ) : (
                      <span className="num text-xs">{mv.ref}</span>
                    )}
                  </td>
                  <td className="text-muted text-xs">{mv.note}</td>
                  <td className="text-xs">{mv.user}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showEntry && <InventoryStockEntryModal onClose={() => setShowEntry(false)} />}
      {showAdjust && <InventoryStockAdjustModal onClose={() => setShowAdjust(false)} />}
      {showNew && <InventoryNewMaterialModal onClose={() => setShowNew(false)} />}
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  tone: Tone;
  icon?: ReactNode;
}) {
  const color = TONE_COLOR[tone];
  return (
    <div className="card p-4">
      <div
        className="flex items-center gap-1.5 text-muted text-[11px] uppercase"
        style={{ letterSpacing: ".06em" }}
      >
        {icon && <span style={{ color }}>{icon}</span>}
        {label}
      </div>
      <div className="font-semibold mt-1.5" style={{ fontSize: 26, color }}>
        {value}
      </div>
      <div className="text-[11px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}
