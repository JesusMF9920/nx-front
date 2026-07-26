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

/**
 * Celdas → payload de la API.
 *
 * El `colorCode` es parte de la IDENTIDAD de la celda, no un adorno: sin él dos
 * colores de la misma talla colapsan en una y el backend rechaza la línea con
 * `Duplicate (size,color) cell`. Se omite (en vez de mandarlo nulo) cuando la
 * celda no tiene color, porque un producto sin colores rechaza el campo.
 */
export function toApiSizeBreakdown(
  cells: readonly (SizeCell & { qty: number })[],
): { sizeId: string; qty: number; colorCode?: string }[] {
  return cells
    .filter((c) => c.qty > 0)
    .map((c) => ({
      sizeId: c.sizeId,
      qty: c.qty,
      ...(c.colorCode ? { colorCode: c.colorCode } : {}),
    }));
}

/**
 * ¿Este desglose es previo a la matriz talla×color?
 *
 * Los pedidos y cotizaciones guardados antes de que el color sobreviviera el
 * mapper NO traen `colorCode` en ninguna celda. Editarlos con el picker de
 * matriz los rehidrataría VACÍOS (su estado inicial sólo lee celdas con color),
 * así que hay que mandarlos al desglose por talla plana.
 */
export function isLegacyBreakdown(cells: readonly SizeCell[] | undefined): boolean {
  return !!cells?.length && !cells.some((c) => c.colorCode);
}
