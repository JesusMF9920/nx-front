import type { Product } from "./types";

export const NEXUM_PRODUCTS: Product[] = [
  {
    id: "p01", sku: "PLY-DTF-001", name: "Playera blanca DTF", category: "Textil", method: "DTF",
    source: "Interno", leadDays: 2, price: 150, cost: 78, stock: 142, unit: "pza",
    needsApproval: true, active: true,
    variantType: "sizedFromMaterial", sizedFromMaterial: "m01",
    sizeSurcharges: { EG: 15, EEG: 25 },
  },
  {
    id: "p02", sku: "PLY-SRG-002", name: "Playera serigrafía 1 tinta", category: "Textil", method: "Serigrafía",
    source: "Interno", leadDays: 3, price: 110, cost: 52, stock: 96, unit: "pza",
    needsApproval: true, active: true,
    variantType: "sizedFromMaterial", sizedFromMaterial: "m01",
    sizeSurcharges: { EG: 10, EEG: 20 },
  },
  {
    id: "p03", sku: "VAS-SUB-003", name: "Vaso cerámico sublimado 11oz", category: "Promocional", method: "Sublimación",
    source: "Interno", leadDays: 2, price: 85, cost: 32, stock: 220, unit: "pza",
    needsApproval: true, active: true, variantType: "none",
  },
  {
    id: "p04", sku: "TZA-MGC-004", name: "Taza mágica 11oz", category: "Promocional", method: "Sublimación",
    source: "Interno", leadDays: 3, price: 145, cost: 58, stock: 48, unit: "pza",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "11", label: "11 oz", priceMod: 0,  stock: 30 },
      { id: "15", label: "15 oz", priceMod: 25, stock: 18 },
    ],
  },
  {
    id: "p05", sku: "LON-13O-005", name: "Lona 13oz frontlit", category: "Gran formato", method: "Impresión gran formato",
    source: "Proveedor", supplier: "Lonas del Bajío", leadDays: 3, price: 95, cost: 48, stock: 0, unit: "m²",
    needsApproval: true, active: true,
    variantType: "dimension",
    dimensionConfig: { unit: "m", min: 0.5, max: 12, step: 0.1, priceMode: "area" },
  },
  {
    id: "p06", sku: "VIN-TXT-006", name: "Vinil textil corte", category: "Textil", method: "Corte vinil",
    source: "Interno", leadDays: 1, price: 45, cost: 18, stock: 880, unit: "m²",
    needsApproval: true, active: true,
    variantType: "dimension",
    dimensionConfig: { unit: "cm", min: 10, max: 600, step: 1, priceMode: "area" },
  },
  {
    id: "p07", sku: "BOR-PAR-007", name: "Parche bordado", category: "Bordado", method: "Bordado",
    source: "Proveedor", supplier: "Bordados Norte", leadDays: 5, price: 68, cost: 29, stock: 0, unit: "pza",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "5x5",    label: "5×5 cm",   priceMod: -15, stock: 0 },
      { id: "8x8",    label: "8×8 cm",   priceMod: 0,   stock: 0 },
      { id: "10x10",  label: "10×10 cm", priceMod: 18,  stock: 0 },
      { id: "custom", label: "A medida", priceMod: 35,  stock: 0 },
    ],
  },
  {
    id: "p08", sku: "TAR-PRE-008", name: "Tarjeta presentación couché", category: "Papelería", method: "Offset",
    source: "Interno", leadDays: 2, price: 380, cost: 140, stock: 24, unit: "millar",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "9x5",     label: "9×5 cm (estándar)", priceMod: 0,  stock: 24 },
      { id: "8.5x5.5", label: "8.5×5.5 cm",        priceMod: 20, stock: 12 },
    ],
  },
  {
    id: "p09", sku: "VOL-FLY-009", name: "Volante full color", category: "Papelería", method: "Digital",
    source: "Interno", leadDays: 2, price: 850, cost: 320, stock: 12, unit: "millar",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "1-4",   label: "1/4 carta", priceMod: 0,   stock: 12 },
      { id: "1-2",   label: "1/2 carta", priceMod: 250, stock: 8 },
      { id: "carta", label: "Carta",     priceMod: 480, stock: 4 },
    ],
  },
  {
    id: "p10", sku: "SEL-AUT-010", name: "Sello automático", category: "Papelería", method: "Fotograbado",
    source: "Proveedor", supplier: "Fotograbado MX", leadDays: 3, price: 320, cost: 145, stock: 0, unit: "pza",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "4x6",  label: "4×6 cm",  priceMod: 0,   stock: 0 },
      { id: "5x8",  label: "5×8 cm",  priceMod: 60,  stock: 0 },
      { id: "6x10", label: "6×10 cm", priceMod: 120, stock: 0 },
    ],
  },
  {
    id: "p11", sku: "GOR-SUB-011", name: "Gorra sublimada", category: "Textil", method: "Sublimación",
    source: "Interno", leadDays: 3, price: 165, cost: 72, stock: 38, unit: "pza",
    needsApproval: true, active: true, variantType: "none",
  },
  {
    id: "p12", sku: "BOL-ECO-012", name: "Bolsa ecológica algodón", category: "Promocional", method: "Serigrafía",
    source: "Interno", leadDays: 3, price: 95, cost: 38, stock: 156, unit: "pza",
    needsApproval: true, active: true,
    variantType: "preset",
    variants: [
      { id: "30x40", label: "30×40 cm", priceMod: 0,  stock: 80 },
      { id: "38x42", label: "38×42 cm", priceMod: 15, stock: 76 },
    ],
  },
];
