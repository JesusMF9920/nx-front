/**
 * Catálogos SAT (subconjuntos curados) para CFDI 4.0. NO son los catálogos
 * completos del SAT — sólo las claves más usadas por una imprenta, para poblar
 * los <select> de captura fiscal sin obligar a memorizar códigos. El valor que
 * viaja al backend es el `code`; el `label` es sólo para la UI.
 */

export type SatCatalogEntry = { code: string; label: string };

/** c_RegimenFiscal — régimen fiscal del emisor/receptor. */
export const REGIMEN_FISCAL: SatCatalogEntry[] = [
  { code: "601", label: "601 — General de Ley Personas Morales" },
  { code: "603", label: "603 — Personas Morales con Fines no Lucrativos" },
  { code: "605", label: "605 — Sueldos y Salarios e Ingresos Asimilados" },
  { code: "606", label: "606 — Arrendamiento" },
  { code: "607", label: "607 — Enajenación o Adquisición de Bienes" },
  { code: "608", label: "608 — Demás ingresos" },
  { code: "610", label: "610 — Residentes en el Extranjero" },
  { code: "611", label: "611 — Ingresos por Dividendos" },
  { code: "612", label: "612 — Personas Físicas con Actividad Empresarial" },
  { code: "614", label: "614 — Ingresos por intereses" },
  { code: "615", label: "615 — Ingresos por obtención de premios" },
  { code: "616", label: "616 — Sin obligaciones fiscales" },
  { code: "620", label: "620 — Sociedades Cooperativas de Producción" },
  { code: "621", label: "621 — Incorporación Fiscal" },
  { code: "622", label: "622 — Actividades Agrícolas, Ganaderas, Silvícolas" },
  { code: "623", label: "623 — Opcional para Grupos de Sociedades" },
  { code: "624", label: "624 — Coordinados" },
  { code: "625", label: "625 — Actividades vía Plataformas Tecnológicas" },
  { code: "626", label: "626 — Régimen Simplificado de Confianza (RESICO)" },
];

/** c_UsoCFDI — uso del CFDI del receptor (subset usual). */
export const USO_CFDI: SatCatalogEntry[] = [
  { code: "G01", label: "G01 — Adquisición de mercancías" },
  { code: "G02", label: "G02 — Devoluciones, descuentos o bonificaciones" },
  { code: "G03", label: "G03 — Gastos en general" },
  { code: "I01", label: "I01 — Construcciones" },
  { code: "I02", label: "I02 — Mobiliario y equipo de oficina" },
  { code: "I03", label: "I03 — Equipo de transporte" },
  { code: "I04", label: "I04 — Equipo de cómputo y accesorios" },
  { code: "I08", label: "I08 — Otra maquinaria y equipo" },
  { code: "D01", label: "D01 — Honorarios médicos y gastos hospitalarios" },
  { code: "D10", label: "D10 — Pagos por servicios educativos" },
  { code: "S01", label: "S01 — Sin efectos fiscales" },
  { code: "CP01", label: "CP01 — Pagos" },
];

/** c_ClaveUnidad — unidad de medida (subset usual en imprenta). */
export const CLAVE_UNIDAD: SatCatalogEntry[] = [
  { code: "H87", label: "H87 — Pieza" },
  { code: "E48", label: "E48 — Unidad de servicio" },
  { code: "E51", label: "E51 — Trabajo" },
  { code: "EA", label: "EA — Elemento" },
  { code: "C62", label: "C62 — Uno" },
  { code: "MTR", label: "MTR — Metro" },
  { code: "MTK", label: "MTK — Metro cuadrado" },
  { code: "XBX", label: "XBX — Caja" },
  { code: "KGM", label: "KGM — Kilogramo" },
  { code: "HUR", label: "HUR — Hora" },
];

/** c_ObjetoImp — objeto de impuesto del concepto. */
export const OBJETO_IMPUESTO: SatCatalogEntry[] = [
  { code: "01", label: "01 — No objeto de impuesto" },
  { code: "02", label: "02 — Sí objeto de impuesto" },
  { code: "03", label: "03 — Sí objeto y no obligado al desglose" },
  { code: "04", label: "04 — Sí objeto y no causa impuesto" },
];

/** Devuelve el label de un catálogo, o el code crudo si no está en el subset. */
export function satLabel(
  catalog: SatCatalogEntry[],
  code: string | null | undefined,
): string {
  if (!code) return "";
  return catalog.find((e) => e.code === code)?.label ?? code;
}
