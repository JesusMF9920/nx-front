import type { Material, Recipe } from "./types";

export const NEXUM_MATERIALS: Material[] = [
  {
    id: "m01", sku: "MAT-PLY-BLA", name: "Playera blanca algodón", category: "Textil",
    unit: "pza", stock: 184, reorder: 60, cost: 48,
    location: "Estante A-1", supplierName: "Textiles Bajío",
    variants: [
      { id: "CH",  label: "CH",  stock: 32 },
      { id: "M",   label: "M",   stock: 58 },
      { id: "G",   label: "G",   stock: 51 },
      { id: "EG",  label: "EG",  stock: 28 },
      { id: "EEG", label: "EEG", stock: 15 },
    ],
  },
  { id: "m02", sku: "MAT-DTF-FLM", name: "Film DTF transferencia",   category: "Tinta/Film", unit: "m²",    stock: 86,   reorder: 30,  cost: 95,  location: "Estante B-2", supplierName: "Insumos GR" },
  { id: "m03", sku: "MAT-DTF-PWD", name: "Polvo hot-melt DTF",       category: "Tinta/Film", unit: "kg",    stock: 4.2,  reorder: 2,   cost: 480, location: "Estante B-2", supplierName: "Insumos GR" },
  { id: "m04", sku: "MAT-VAS-CER", name: "Vaso cerámico blanco 11oz",category: "Promo",      unit: "pza",   stock: 312,  reorder: 80,  cost: 22,  location: "Estante C-1", supplierName: "Cerámicas MX" },
  { id: "m05", sku: "MAT-SUB-PAP", name: "Papel sublimación A4",     category: "Tinta/Film", unit: "hoja",  stock: 1240, reorder: 500, cost: 3.5, location: "Estante B-3", supplierName: "Insumos GR" },
  { id: "m06", sku: "MAT-SUB-INK", name: "Tinta sublimación cyan",   category: "Tinta/Film", unit: "ml",    stock: 380,  reorder: 200, cost: 1.2, location: "Estante B-1", supplierName: "Insumos GR" },
  { id: "m07", sku: "MAT-SRG-EMU", name: "Emulsión serigrafía",      category: "Tinta/Film", unit: "kg",    stock: 1.8,  reorder: 1,   cost: 320, location: "Estante D-1", supplierName: "Serigrafía MX" },
  { id: "m08", sku: "MAT-VIN-TXT", name: "Vinil textil termo",       category: "Vinil",      unit: "m²",    stock: 18,   reorder: 8,   cost: 65,  location: "Estante D-2", supplierName: "Insumos GR" },
  { id: "m09", sku: "MAT-PAP-COU", name: "Papel couché 250g",        category: "Papel",      unit: "pliego",stock: 420,  reorder: 200, cost: 4.8, location: "Estante E-1", supplierName: "Papelera Norte" },
  { id: "m10", sku: "MAT-PAP-BON", name: "Papel bond 90g",           category: "Papel",      unit: "pliego",stock: 1820, reorder: 800, cost: 1.8, location: "Estante E-2", supplierName: "Papelera Norte" },
  { id: "m11", sku: "MAT-GOR-BLA", name: "Gorra blanca algodón",     category: "Textil",     unit: "pza",   stock: 52,   reorder: 30,  cost: 65,  location: "Estante A-3", supplierName: "Textiles Bajío" },
  { id: "m12", sku: "MAT-BOL-ECO", name: "Bolsa ecológica cruda",    category: "Textil",     unit: "pza",   stock: 198,  reorder: 80,  cost: 32,  location: "Estante A-4", supplierName: "Textiles Bajío" },
  { id: "m13", sku: "MAT-TIN-OFF", name: "Tinta offset CMYK (set)",  category: "Tinta/Film", unit: "kg",    stock: 0.8,  reorder: 1,   cost: 920, location: "Estante D-3", supplierName: "Tintas Premium" },
];

export const NEXUM_RECIPES: Record<string, Recipe> = {
  p01: [
    { materialId: "m01", qty: 1,    byVariant: true, note: "Talla del cliente" },
    { materialId: "m02", qty: 0.40, note: "Film DTF (≈1 frente A4)" },
    { materialId: "m03", qty: 0.025,note: "Polvo hot-melt" },
  ],
  p02: [
    { materialId: "m01", qty: 1, byVariant: true },
    { materialId: "m07", qty: 0.008, note: "Emulsión por pieza" },
  ],
  p03: [
    { materialId: "m04", qty: 1 },
    { materialId: "m05", qty: 1, note: "Papel sublimación" },
    { materialId: "m06", qty: 4, note: "Tinta promedio (4 colores)" },
  ],
  p04: [
    { materialId: "m04", qty: 1 },
    { materialId: "m05", qty: 1 },
    { materialId: "m06", qty: 6 },
  ],
  p06: [{ materialId: "m08", qty: 1, note: "1 m² por m² vendido" }],
  p08: [
    { materialId: "m09", qty: 125, note: "≈125 pliegos por millar" },
    { materialId: "m13", qty: 0.04 },
  ],
  p09: [
    { materialId: "m10", qty: 250 },
    { materialId: "m13", qty: 0.06 },
  ],
  p11: [
    { materialId: "m11", qty: 1 },
    { materialId: "m05", qty: 1 },
    { materialId: "m06", qty: 5 },
  ],
  p12: [
    { materialId: "m12", qty: 1 },
    { materialId: "m07", qty: 0.005 },
  ],
};
