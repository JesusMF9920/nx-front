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
