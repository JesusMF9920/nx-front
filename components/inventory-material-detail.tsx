import Link from "next/link";
import { I } from "@/components/icons";
import { fmtMXN } from "@/lib/format";
import { NEXUM_RECIPES } from "@/lib/mock-materials";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";
import type { Material, Product } from "@/lib/types";

type ProductUsing = {
  product: Product;
  qty: number;
  note?: string;
};

function productsUsing(materialId: string): ProductUsing[] {
  const list: ProductUsing[] = [];
  for (const pid of Object.keys(NEXUM_RECIPES)) {
    const recipe = NEXUM_RECIPES[pid];
    const item = recipe.find((r) => r.materialId === materialId);
    if (item) {
      const product = NEXUM_PRODUCTS.find((p) => p.id === pid);
      if (product) list.push({ product, qty: item.qty, note: item.note });
    }
  }
  return list;
}

export function InventoryMaterialDetail({ material }: { material: Material }) {
  const isLow = material.stock <= material.reorder;
  const isCritical = material.stock <= material.reorder * 0.5;
  const pct = Math.min(100, Math.round((material.stock / (material.reorder * 2)) * 100));
  const using = productsUsing(material.id);

  return (
    <div className="card" style={{ position: "sticky", top: 16 }}>
      <div className="card__head">
        <div>
          <div className="card__title">{material.name}</div>
          <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            {material.sku}
          </div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Editar insumo">{I.edit}</button>
      </div>

      <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="num" style={{ fontSize: 32, fontWeight: 600 }}>{material.stock}</span>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>{material.unit}</span>
          <div className="spacer" />
          {isCritical ? (
            <span className="pill pill--danger">{I.alert} Crítico</span>
          ) : isLow ? (
            <span className="pill pill--warn">Reordenar</span>
          ) : (
            <span className="pill pill--ok">{I.check} OK</span>
          )}
        </div>
        <div
          style={{
            height: 6,
            background: "var(--surface-3)",
            borderRadius: 3,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: isCritical ? "var(--danger)" : isLow ? "var(--warn)" : "var(--ok)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          <span>
            Reorden:{" "}
            <span className="num">
              {material.reorder} {material.unit}
            </span>
          </span>
          <span>
            Costo unit.: <span className="num">{fmtMXN(material.cost)}</span>
          </span>
        </div>
      </div>

      {material.variants && (
        <div style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
          <div className="label" style={{ marginBottom: 8 }}>Por variante</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6 }}>
            {material.variants.map((v) => (
              <div
                key={v.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  padding: "6px 8px",
                  textAlign: "center",
                  background: v.stock < 10 ? "var(--warn-soft)" : "var(--surface-2)",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{v.label}</div>
                <div className="num" style={{ fontWeight: 600, fontSize: 14 }}>{v.stock}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          padding: 16,
          borderBottom: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          fontSize: 12,
        }}
      >
        <div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Ubicación
          </div>
          <div style={{ fontWeight: 500 }}>{material.location}</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Proveedor
          </div>
          <div style={{ fontWeight: 500 }}>{material.supplierName}</div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Productos que consumen este insumo
        </div>
        {using.length === 0 ? (
          <div className="empty" style={{ padding: 16, fontSize: 12 }}>
            Ningún producto activo lo consume.
          </div>
        ) : (
          using.map(({ product, qty, note }) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              style={{
                display: "flex",
                gap: 10,
                padding: "8px 0",
                borderTop: "1px solid var(--line)",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="skeleton-img" style={{ width: 32, height: 32, fontSize: 9, flexShrink: 0 }}>
                •
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{product.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 10 }}>{note ?? "—"}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11 }}>
                <div className="num" style={{ fontWeight: 600 }}>
                  {qty} {material.unit}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 10 }}>por unidad</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {isLow && (
        <div
          style={{
            padding: 14,
            background: "var(--warn-soft)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--warn)" }}>{I.alert}</span>
          <div style={{ flex: 1, fontSize: 12 }}>
            Sugerir orden de compra a <strong>{material.supplierName}</strong>
          </div>
          <button className="btn btn--sm btn--primary">Generar OC</button>
        </div>
      )}
    </div>
  );
}
