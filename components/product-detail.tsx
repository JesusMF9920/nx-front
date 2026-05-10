import Link from "next/link";
import { I } from "@/components/icons";
import { Kv } from "@/components/kv";
import { fmtInt, fmtMXN } from "@/lib/format";
import type { Product, ProductSource, Variant, VariantType } from "@/lib/types";

const VARIANT_LABEL: Record<VariantType, string> = {
  none: "Producto sin variantes",
  size: "Tallas",
  preset: "Medidas predefinidas",
  dimension: "Medida libre (alto × ancho)",
  sizedFromMaterial: "Tallas (desde insumo)",
};

export function ProductDetail({ product }: { product: Product }) {
  const variantLabel = VARIANT_LABEL[product.variantType];
  const variantCount = product.variants?.length ?? 0;
  const margin = Math.round((1 - product.cost / product.price) * 100);
  const isTableVariants = product.variantType === "size" || product.variantType === "preset";

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">{product.name}</div>
        <span className="tag">{product.sku}</span>
        <div className="spacer" />
        {product.source === "Proveedor" ? (
          <span className="pill pill--supplier">{product.supplier}</span>
        ) : (
          <span className="pill pill--neutral">Producción interna</span>
        )}
        <button className="btn btn--sm">{I.edit} Editar</button>
      </div>
      <div className="card__body">
        <div className="grid gap-6" style={{ gridTemplateColumns: "200px 1fr 1fr" }}>
          <div className="skeleton-img" style={{ height: 180 }}>{product.method}</div>

          <div className="grid gap-2.5">
            <Kv k="Categoría" v={product.category} />
            <Kv k="Método" v={product.method} />
            <Kv k="Unidad de venta" v={product.unit} />
            <Kv k="Tiempo de entrega" v={`${product.leadDays} día${product.leadDays > 1 ? "s" : ""}`} />
            <Kv k="Aprobación de diseño" v={product.needsApproval ? "Requerida" : "No requiere"} />
          </div>

          <div className="grid gap-2.5">
            <Kv
              k={product.variantType === "dimension" ? "Precio base" : "Precio"}
              v={`${fmtMXN(product.price)} / ${product.unit}`}
              mono
            />
            <Kv k="Costo" v={`${fmtMXN(product.cost)} / ${product.unit}`} mono />
            <Kv k="Margen" v={`${margin}%`} mono />
            <Kv
              k="Stock disponible"
              v={product.source === "Proveedor" ? "Bajo demanda" : `${fmtInt(product.stock)} ${product.unit}`}
              mono
            />
            <Kv k="Estatus" v={<span className="pill pill--ok">Activo</span>} />
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="text-accent">{I.layers}</span>
          <div className="font-medium">{variantLabel}</div>
          {variantCount > 0 && (
            <span className="tag">
              {variantCount} {product.variantType === "size" ? "tallas" : "opciones"}
            </span>
          )}
          <div className="spacer" />
          <button className="btn btn--sm">{I.edit} Configurar</button>
        </div>

        {isTableVariants && product.variants ? (
          <VariantsTable
            variants={product.variants}
            basePrice={product.price}
            source={product.source}
            variantType={product.variantType}
          />
        ) : product.variantType === "dimension" && product.dimensionConfig ? (
          <div className="p-3.5 border border-line rounded-md bg-surface-2">
            <div className="grid grid-cols-4 gap-3.5">
              <Kv k="Unidad" v={product.dimensionConfig.unit} mono />
              <Kv k="Mínimo" v={`${product.dimensionConfig.min} ${product.dimensionConfig.unit}`} mono />
              <Kv k="Máximo" v={`${product.dimensionConfig.max} ${product.dimensionConfig.unit}`} mono />
              <Kv
                k="Cobro"
                v={product.dimensionConfig.priceMode === "area" ? "Por m²" : "Por metro lineal"}
              />
            </div>
            <div className="help mt-2.5">
              En el POS, el cajero captura alto × ancho y el sistema calcula el precio:{" "}
              <span className="num">
                {fmtMXN(product.price)}/{product.unit}
              </span>{" "}
              × área.
            </div>
          </div>
        ) : product.variantType === "sizedFromMaterial" && product.sizeSurcharges ? (
          <div className="p-3.5 border border-line rounded-md bg-surface-2">
            <div className="help mb-2">
              Las tallas y stock viven en el <strong>insumo</strong> ({product.sizedFromMaterial}). Aquí sólo se configura el cargo extra por talla.
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(product.sizeSurcharges).map(([size, surcharge]) => (
                <span key={size} className="tag">
                  {size}: +{fmtMXN(surcharge)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty p-4">
            Este producto se vende sin opciones de talla o medida.
          </div>
        )}

        <div className="divider" />

        <div className="flex gap-1.5 flex-wrap">
          <Link href="/pos" className="btn btn--accent btn--sm">
            {I.cart} Vender ahora
          </Link>
          <button className="btn btn--sm">{I.copy} Duplicar</button>
          <button className="btn btn--sm">{I.chart} Historial de ventas</button>
          {product.source === "Proveedor" && (
            <Link href="/suppliers" className="btn btn--sm">
              {I.factory} Ver proveedor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantsTable({
  variants,
  basePrice,
  source,
  variantType,
}: {
  variants: Variant[];
  basePrice: number;
  source: ProductSource;
  variantType: VariantType;
}) {
  return (
    <table className="tbl border border-line rounded-md overflow-hidden">
      <thead>
        <tr>
          <th>{variantType === "size" ? "Talla" : "Medida"}</th>
          <th className="text-right">Precio</th>
          <th className="text-right">Modificador</th>
          {source !== "Proveedor" && <th className="text-right">Stock</th>}
        </tr>
      </thead>
      <tbody>
        {variants.map((v) => (
          <tr key={v.id}>
            <td>
              <strong>{v.label}</strong>
            </td>
            <td className="num text-right">{fmtMXN(basePrice + v.priceMod)}</td>
            <td
              className="num text-right"
              style={{
                color: v.priceMod === 0 ? "var(--muted)" : v.priceMod > 0 ? "var(--ok)" : "var(--danger)",
              }}
            >
              {v.priceMod === 0 ? "—" : (v.priceMod > 0 ? "+" : "") + fmtMXN(v.priceMod)}
            </td>
            {source !== "Proveedor" && (
              <td
                className="num text-right"
                style={{ color: v.stock < 15 ? "var(--warn)" : "var(--ink)" }}
              >
                {fmtInt(v.stock)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
