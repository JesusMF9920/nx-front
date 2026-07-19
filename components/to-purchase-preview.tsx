import { I } from "@/components/icons";
import type { ApiToPurchaseLine } from "@/lib/api/types";

/**
 * Bloques compartidos POS / conversión de cotización: insumos "por comprar"
 * derivados del preview de stock. `shortfall` = faltante de un insumo CON stock
 * (se vende lo disponible y se compra el resto, estilo warn); el resto =
 * `buy_to_order` (sin stock, se compra todo, estilo neutro). Ninguno bloquea la
 * venta (política "nunca bloquear").
 */
export function ToPurchasePreview({
  toPurchase,
}: {
  toPurchase: ApiToPurchaseLine[];
}) {
  const backorders = toPurchase.filter((t) => t.kind === "shortfall");
  // "Bajo demanda" es el bucket por defecto: así ninguna línea desaparece si el
  // backend omitiera `kind` o trajera un valor inesperado (skew de despliegue).
  const buyToOrder = toPurchase.filter((t) => t.kind !== "shortfall");

  return (
    <>
      {backorders.length > 0 && (
        <>
          <div className="divider" />
          <div
            className="label mb-2 flex items-center gap-1.5"
            style={{ color: "var(--warn)" }}
          >
            {I.cart} Faltante — se comprará
          </div>
          <div
            className="rounded-md p-2.5"
            style={{
              border: "1px solid var(--warn)",
              background: "var(--warn-soft)",
            }}
          >
            {backorders.map((t) => (
              <div
                key={t.materialId + (t.materialVariantCode ?? "")}
                className="flex items-center gap-2 text-xs py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {t.materialName}
                    {t.materialVariantCode ? ` · ${t.materialVariantCode}` : ""}
                  </div>
                  <div className="text-muted text-[10px]">
                    De {t.requiredQty} {t.unit} pedidas, {t.available ?? 0} en
                    stock · {t.supplierName ?? "Sin proveedor"}
                  </div>
                </div>
                <span
                  className="num font-semibold"
                  style={{ color: "var(--warn)" }}
                >
                  compra {t.qty.toFixed(2)} {t.unit}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted mt-1.5">
            Se vende lo disponible y el faltante se manda a “Por comprar”. No
            bloquea la venta.
          </div>
        </>
      )}

      {buyToOrder.length > 0 && (
        <>
          <div className="divider" />
          <div className="label mb-2 flex items-center gap-1.5">
            {I.cart} Se comprará (bajo demanda)
          </div>
          <div className="bg-surface-2 border border-line rounded-md p-2.5">
            {buyToOrder.map((t) => (
              <div
                key={t.materialId + (t.materialVariantCode ?? "")}
                className="flex items-center gap-2 text-xs py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {t.materialName}
                    {t.materialVariantCode ? ` · ${t.materialVariantCode}` : ""}
                  </div>
                  <div className="text-muted text-[10px]">
                    {t.supplierName ?? "Sin proveedor"}
                  </div>
                </div>
                <span className="num font-semibold">
                  {t.qty.toFixed(2)} {t.unit}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted mt-1.5">
            Estos insumos no se almacenan: se comprarán para este pedido (no
            bloquean la venta).
          </div>
        </>
      )}
    </>
  );
}
