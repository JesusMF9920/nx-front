// Paleta y utilidades de colores de producto (eje talla×color). Compartido por
// el alta de producto, el editor del detalle y el generador de matriz del
// material, para que el código derivado del color sea idéntico en todos lados.

export type ProductColorOption = { code: string; label: string; hex: string };

/**
 * Deriva un código de color estable desde su etiqueta: sin acentos, MAYÚSCULAS,
 * sin espacios ni el separador reservado `|` (que el backend usa para la
 * variante compuesta "{talla}|{color}"). "Café" → "CAFE", "Rojo óxido" →
 * "ROJO_OXIDO". Debe producir el MISMO código en el producto y en el material.
 */
export function colorCodeFromLabel(label: string): string {
  return label
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos (acentos)
    .toUpperCase()
    .replace(/\|/g, "")
    .replace(/\s+/g, "_");
}

/** Colores básicos preseleccionables. El `code` = colorCodeFromLabel(label). */
export const BASIC_COLORS: ProductColorOption[] = [
  { code: "BLANCO", label: "Blanco", hex: "#FFFFFF" },
  { code: "NEGRO", label: "Negro", hex: "#1F2937" },
  { code: "GRIS", label: "Gris", hex: "#9CA3AF" },
  { code: "ROJO", label: "Rojo", hex: "#DC2626" },
  { code: "NARANJA", label: "Naranja", hex: "#EA580C" },
  { code: "AMARILLO", label: "Amarillo", hex: "#FACC15" },
  { code: "VERDE", label: "Verde", hex: "#16A34A" },
  { code: "AZUL", label: "Azul", hex: "#2563EB" },
  { code: "MARINO", label: "Azul marino", hex: "#1E3A8A" },
  { code: "MORADO", label: "Morado", hex: "#7C3AED" },
  { code: "ROSA", label: "Rosa", hex: "#EC4899" },
  { code: "CAFE", label: "Café", hex: "#78350F" },
  { code: "BEIGE", label: "Beige", hex: "#D8C29D" },
];

/** Hex conocido para un código de color (para pintar el swatch); undefined si es custom. */
export function hexForColorCode(code: string): string | undefined {
  return BASIC_COLORS.find((c) => c.code === code)?.hex;
}

/**
 * Color CSS para el swatch de un código: el hex conocido de la paleta, o un
 * color HSL determinista por hash del código para los custom (estable y
 * distinguible — nunca transparente).
 */
export function swatchForColorCode(code: string): string {
  const known = hexForColorCode(code);
  if (known) return known;
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (Math.imul(h, 31) + code.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360} 42% 62%)`;
}

/**
 * Separador reservado de la variante compuesta del insumo: "{talla}|{color}".
 * DEBE coincidir con COMPOSITE_CODE_SEPARATOR del backend (product-colors.vo.ts).
 */
export const COMPOSITE_SEP = "|";

/** Parte un code de variante compuesta "TALLA|COLOR". null si no es compuesta. */
export function parseCompositeCode(
  code: string,
): { size: string; color: string } | null {
  const at = code.indexOf(COMPOSITE_SEP);
  if (at < 0) return null;
  const size = code.slice(0, at);
  const color = code.slice(at + COMPOSITE_SEP.length);
  if (!size || !color) return null;
  return { size, color };
}

/** true si las variantes del insumo forman una matriz talla×color (tienen "|"). */
export function materialHasColorMatrix(
  variants: { code: string }[],
): boolean {
  return variants.some((v) => v.code.includes(COMPOSITE_SEP));
}

/**
 * Reconcilia los colores DECLARADOS del producto contra las variantes
 * compuestas del insumo, para evitar desajustes silenciosos:
 *  - `declaredWithoutCombo`: colores declarados sin NINGUNA combinación en el
 *    insumo → celdas "—" invendibles hasta cargarles stock.
 *  - `orphanColors`: combinaciones del insumo con stock > 0 cuyo color NO está
 *    declarado → stock invisible/invendible (agrégalo para venderlo).
 */
export function reconcileColors(
  declaredCodes: string[],
  variants: { code: string; stock: number }[],
): {
  declaredWithoutCombo: string[];
  orphanColors: { color: string; stock: number }[];
} {
  const declared = new Set(declaredCodes);
  const stockByColor = new Map<string, number>();
  for (const v of variants) {
    const parsed = parseCompositeCode(v.code);
    if (!parsed) continue;
    stockByColor.set(
      parsed.color,
      (stockByColor.get(parsed.color) ?? 0) + v.stock,
    );
  }
  return {
    declaredWithoutCombo: declaredCodes.filter((c) => !stockByColor.has(c)),
    orphanColors: [...stockByColor.entries()]
      .filter(([color, stock]) => stock > 0 && !declared.has(color))
      .map(([color, stock]) => ({ color, stock })),
  };
}
