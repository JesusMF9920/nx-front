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
        <div className="card__head" style={{ gap: 8 }}>
          <div className="topbar__search" style={{ margin: 0, width: 280 }}>
            {I.search}
            <input
              placeholder="Buscar por nombre o SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <div
            style={{
              display: "flex",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}
          >
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
                <th style={{ textAlign: "right" }}>Precio</th>
                <th style={{ textAlign: "right" }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => open(p.id)}>
                  <td>
                    <div className="skeleton-img" style={{ width: 36, height: 36, fontSize: 9 }}>
                      {p.method.slice(0, 3).toUpperCase()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{p.sku}</div>
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
                  <td className="num" style={{ textAlign: "right" }}>
                    {fmtMXN(p.price)}
                    <span style={{ color: "var(--muted)", fontSize: 11 }}> /{p.unit}</span>
                  </td>
                  <td
                    className="num"
                    style={{
                      textAlign: "right",
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
            <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="card"
                  style={{ cursor: "pointer", boxShadow: "none" }}
                  onClick={() => open(p.id)}
                >
                  <div className="skeleton-img" style={{ height: 120, borderRadius: "10px 10px 0 0" }}>
                    {p.method}
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{p.sku}</div>
                    <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 6 }}>
                      <span className="num" style={{ fontWeight: 600 }}>{fmtMXN(p.price)}</span>
                      <span className="spacer" />
                      {p.source === "Proveedor" ? (
                        <span className="tag" style={{ color: "var(--supplier)" }}>Prov.</span>
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
