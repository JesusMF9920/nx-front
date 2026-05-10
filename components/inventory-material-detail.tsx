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
    <div className="card sticky top-4">
      <div className="card__head">
        <div>
          <div className="card__title">{material.name}</div>
          <div className="text-muted text-[11px] font-mono">{material.sku}</div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Editar insumo">{I.edit}</button>
      </div>

      <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-baseline gap-1.5">
          <span className="num font-semibold" style={{ fontSize: 32 }}>{material.stock}</span>
          <span className="text-muted text-sm">{material.unit}</span>
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
          className="bg-surface-3 mt-2.5 overflow-hidden"
          style={{ height: 6, borderRadius: 3 }}
        >
          <div
            className="h-full"
            style={{
              width: `${pct}%`,
              background: isCritical ? "var(--danger)" : isLow ? "var(--warn)" : "var(--ok)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-muted">
          <span>
            Reorden: <span className="num">{material.reorder} {material.unit}</span>
          </span>
          <span>
            Costo unit.: <span className="num">{fmtMXN(material.cost)}</span>
          </span>
        </div>
      </div>

      {material.variants && (
        <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="label mb-2">Por variante</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))" }}>
            {material.variants.map((v) => (
              <div
                key={v.id}
                className="border border-line rounded-md py-1.5 px-2 text-center"
                style={{ background: v.stock < 10 ? "var(--warn-soft)" : "var(--surface-2)" }}
              >
                <div className="text-[10px] text-muted">{v.label}</div>
                <div className="num font-semibold text-sm">{v.stock}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="p-4 grid grid-cols-2 gap-3 text-xs"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div>
          <div className="text-muted text-[10px] uppercase" style={{ letterSpacing: ".06em" }}>
            Ubicación
          </div>
          <div className="font-medium">{material.location}</div>
        </div>
        <div>
          <div className="text-muted text-[10px] uppercase" style={{ letterSpacing: ".06em" }}>
            Proveedor
          </div>
          <div className="font-medium">{material.supplierName}</div>
        </div>
      </div>

      <div className="p-4">
        <div className="label mb-2.5">Productos que consumen este insumo</div>
        {using.length === 0 ? (
          <div className="empty p-4 text-xs">
            Ningún producto activo lo consume.
          </div>
        ) : (
          using.map(({ product, qty, note }) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex gap-2.5 py-2 items-center no-underline text-inherit"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div className="skeleton-img text-[9px] shrink-0" style={{ width: 32, height: 32 }}>
                •
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{product.name}</div>
                <div className="text-muted text-[10px]">{note ?? "—"}</div>
              </div>
              <div className="text-right text-[11px]">
                <div className="num font-semibold">{qty} {material.unit}</div>
                <div className="text-muted text-[10px]">por unidad</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {isLow && (
        <div
          className="p-3.5 bg-warn-soft flex gap-2.5 items-center"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <span className="text-warn">{I.alert}</span>
          <div className="flex-1 text-xs">
            Sugerir orden de compra a <strong>{material.supplierName}</strong>
          </div>
          <button className="btn btn--sm btn--primary">Generar OC</button>
        </div>
      )}
    </div>
  );
}
