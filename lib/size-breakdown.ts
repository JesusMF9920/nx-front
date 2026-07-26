/**
 * Formato de una celda talla×color del desglose de una línea.
 *
 * Vive aquí porque el mismo texto se pinta en el detalle del pedido, el de la
 * cotización, el ticket térmico y el carrito de cotización: cuando cada uno lo
 * armaba por su cuenta, unos mostraban el color y otros lo perdían en silencio.
 */
export interface SizeCell {
  sizeId: string;
  /** Etiqueta legible de la talla; los registros viejos no la traen. */
  sizeLabel?: string;
  /** Código de color de la celda; ausente si el producto no maneja color. */
  colorCode?: string;
  /** Etiqueta legible del color, snapshot al vender. */
  colorLabel?: string;
}

/** "Chica Rojo" — o sólo "Chica" cuando la celda no tiene color. */
export function sizeCellLabel(cell: SizeCell): string {
  const size = cell.sizeLabel ?? cell.sizeId;
  const color = cell.colorLabel ?? cell.colorCode;
  return color ? `${size} ${color}` : size;
}

/** "Chica Rojo×2 · Chica Azul×3" — omite las celdas en cero. */
export function sizeCellsSummary(
  cells: readonly (SizeCell & { qty: number })[],
): string {
  return cells
    .filter((c) => c.qty > 0)
    .map((c) => `${sizeCellLabel(c)}×${c.qty}`)
    .join(" · ");
}
