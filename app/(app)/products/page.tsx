"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { NewProductForm } from "@/components/new-product-form";
import { PageHeader } from "@/components/page-header";
import { fmtInt, fmtMXN } from "@/lib/format";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";
import type { Product, ProductFilter, ProductView } from "@/lib/types";

const FILTERS: ProductFilter[] = ["Todos", "Internos", "Proveedor", "Bajo stock"];

function applyFilter(p: Product, f: ProductFilter): boolean {
  if (f === "Internos") return p.source === "Interno";
  if (f === "Proveedor") return p.source === "Proveedor";
  if (f === "Bajo stock") return p.source === "Interno" && p.stock < 60;
  return true;
}

export default function ProductsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<ProductFilter>("Todos");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProductView>("list");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return NEXUM_PRODUCTS.filter((p) => {
      if (search && !`${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
      return applyFilter(p, filter);
    });
  }, [filter, search]);

  const internoCount = NEXUM_PRODUCTS.filter((p) => p.source === "Interno").length;
  const provCount = NEXUM_PRODUCTS.filter((p) => p.source === "Proveedor").length;

  const open = (id: string) => router.push(`/products/${id}`);

  return (
    <>
      <PageHeader
        title="Productos"
        sub={`${NEXUM_PRODUCTS.length} productos · ${internoCount} internos · ${provCount} con proveedor`}
        actions={
          <>
            <button className="btn">
              <span>{I.upload}</span>Importar CSV
            </button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              <span>{I.plus}</span>Nuevo producto
            </button>
          </>
        }
      />

      <div className="card">
        <div className="card__head gap-2">
          <div className="topbar__search m-0" style={{ width: 280 }}>
            {I.search}
            <input
              placeholder="Buscar por nombre o SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <div className="flex border border-line rounded-md overflow-hidden">
            <button
              className={`btn btn--sm ${view === "list" ? "btn--primary" : "btn--ghost"}`}
              style={{ borderRadius: 0, border: 0 }}
              onClick={() => setView("list")}
            >
              Tabla
            </button>
            <button
              className={`btn btn--sm ${view === "grid" ? "btn--primary" : "btn--ghost"}`}
              style={{ borderRadius: 0, border: 0 }}
              onClick={() => setView("grid")}
            >
              Cuadrícula
            </button>
          </div>
        </div>

        {view === "list" ? (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Origen</th>
                <th>Lead</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => open(p.id)}>
                  <td>
                    <div className="skeleton-img text-[9px]" style={{ width: 36, height: 36 }}>
                      {p.method.slice(0, 3).toUpperCase()}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted text-[11px] font-mono">{p.sku}</div>
                  </td>
                  <td><span className="tag">{p.category}</span></td>
                  <td>
                    {p.source === "Interno" ? (
                      <span className="pill pill--neutral">Interno</span>
                    ) : (
                      <span className="pill pill--supplier">{p.supplier}</span>
                    )}
                  </td>
                  <td className="num">{p.leadDays}d</td>
                  <td className="num text-right">
                    {fmtMXN(p.price)}
                    <span className="text-muted text-[11px]"> /{p.unit}</span>
                  </td>
                  <td
                    className="num text-right"
                    style={{
                      color:
                        p.source === "Proveedor"
                          ? "var(--muted-2)"
                          : p.stock < 60
                            ? "var(--warn)"
                            : "var(--ink)",
                    }}
                  >
                    {p.source === "Proveedor" ? "—" : fmtInt(p.stock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card__body">
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="card cursor-pointer"
                  style={{ boxShadow: "none" }}
                  onClick={() => open(p.id)}
                >
                  <div className="skeleton-img" style={{ height: 120, borderRadius: "10px 10px 0 0" }}>
                    {p.method}
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-[13px]">{p.name}</div>
                    <div className="text-muted text-[11px] font-mono">{p.sku}</div>
                    <div className="flex items-center mt-2.5 gap-1.5">
                      <span className="num font-semibold">{fmtMXN(p.price)}</span>
                      <span className="spacer" />
                      {p.source === "Proveedor" ? (
                        <span className="tag text-supplier">Prov.</span>
                      ) : (
                        <span className="tag">{p.stock} stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <Modal
          title="Nuevo producto"
          onClose={() => setShowNew(false)}
          width={760}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="btn">Guardar y crear otro</button>
              <button className="btn btn--accent" onClick={() => setShowNew(false)}>
                Guardar producto
              </button>
            </>
          }
        >
          <NewProductForm />
        </Modal>
      )}
    </>
  );
}
