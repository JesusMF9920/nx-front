/**
 * Cálculos puros del carrito — compartidos por el POS y el builder de
 * cotizaciones, y testeados en lib/pos-cart.test.ts. Son SOLO orientativos
 * para la UI: el total autoritativo siempre lo da el preview server-side
 * (posApi.preview / quotesApi.preview) y el checkout revalida expectedTotal.
 */

export const IVA_RATE = 0.16;

/**
 * Tipado ESTRUCTURAL: CartLine (POS) y BuilderLine (cotizador) encajan sin
 * acoplarse. `unitPriceOverride` sólo existe en el cotizador (precio manual
 * por línea); el POS nunca lo trae.
 */
export type PricedLine = {
  qty: number;
  price: number;
  sizeBreakdown?: { qty: number; surcharge: number }[] | null;
  unitPriceOverride?: number;
};

/** Piezas reales de la línea: con tallas, la suma del desglose. */
export function effectiveQty(line: PricedLine): number {
  if (line.sizeBreakdown) {
    return line.sizeBreakdown.reduce((s, b) => s + b.qty, 0);
  }
  return line.qty;
}

export function lineSubtotal(line: PricedLine): number {
  // El override manual ignora surcharges a propósito (decisión de Fase C:
  // el vendedor fija el precio unitario final de la línea).
  if (line.unitPriceOverride !== undefined) {
    return effectiveQty(line) * line.unitPriceOverride;
  }
  if (line.sizeBreakdown) {
    return line.sizeBreakdown.reduce(
      (s, b) => s + b.qty * (line.price + b.surcharge),
      0,
    );
  }
  return line.qty * line.price;
}

export function cartTotals(
  lines: readonly PricedLine[],
  discount: number,
): { subtotal: number; discountApplied: number; tax: number; total: number } {
  const subtotal = lines.reduce((s, l) => s + lineSubtotal(l), 0);
  // El descuento nunca excede el subtotal (espejo de la validación server).
  const discountApplied = Math.min(discount, subtotal);
  const tax = (subtotal - discountApplied) * IVA_RATE;
  return {
    subtotal,
    discountApplied,
    tax,
    total: subtotal - discountApplied + tax,
  };
}
