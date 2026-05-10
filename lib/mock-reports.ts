import type {
  AgingEntry,
  ClientPerformance,
  ProductPerformance,
  ReportDay,
  SellerPerformance,
} from "./types";

const SEED = [18, 22, 15, 9, 28, 32, 30, 17, 21, 24, 12, 8, 29, 34, 31, 19, 23, 26, 14, 10, 27, 33, 38, 22, 26, 29, 15, 11, 31, 42];

function buildDailyReport(): ReportDay[] {
  const out: ReportDay[] = [];
  const base = new Date("2026-04-11");
  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const sales = SEED[i] * 1100 + Math.round((Math.sin(i) + 1) * 800);
    const orders = Math.round(SEED[i] * 0.6 + 2);
    const margin = sales * (0.34 + Math.sin(i * 0.7) * 0.05);
    out.push({ date: d.toISOString().slice(0, 10), sales, orders, margin });
  }
  return out;
}

export const NEXUM_REPORT_DAILY: ReportDay[] = buildDailyReport();

export const NEXUM_TOP_PRODUCTS: ProductPerformance[] = [
  { name: "Playera blanca DTF",          cat: "Textil",       qty: 482, sales: 72300, margin: 34740 },
  { name: "Tarjeta presentación couché", cat: "Papelería",    qty:  38, sales: 14440, margin:  9120 },
  { name: "Lona 13oz frontlit",          cat: "Gran formato", qty:  96, sales: 41760, margin: 11280 },
  { name: "Vaso cerámico sublimado 11oz",cat: "Promocional",  qty: 312, sales: 26520, margin: 16536 },
  { name: "Bolsa ecológica algodón",     cat: "Promocional",  qty: 184, sales: 17480, margin: 10488 },
  { name: "Gorra sublimada",             cat: "Textil",       qty:  88, sales: 14520, margin:  8184 },
  { name: "Volante full color",          cat: "Papelería",    qty:  22, sales: 18700, margin: 11660 },
  { name: "Parche bordado",              cat: "Bordado",      qty: 145, sales:  9860, margin:  4205 },
];

export const NEXUM_TOP_CLIENTS: ClientPerformance[] = [
  { name: "Escuela Patria Nueva",     orders: 22, sales: 68420, margin: 28100, debt: 4870 },
  { name: "Café Aurora",              orders: 14, sales: 41250, margin: 16400, debt:    0 },
  { name: "Centro Cultural Río",      orders: 11, sales: 28980, margin: 11620, debt:  320 },
  { name: "Estudio Pliegue",          orders:  8, sales: 22150, margin:  9260, debt: 1250 },
  { name: "Despacho Salinas y Asoc.", orders:  6, sales: 18420, margin:  7820, debt:    0 },
];

export const NEXUM_TOP_SELLERS: SellerPerformance[] = [
  { name: "Mariana Castillo", initials: "MC", orders: 38, sales: 142800, ticket: 3758, conv: 78 },
  { name: "Diego Fuentes",    initials: "DF", orders: 31, sales:  98220, ticket: 3168, conv: 64 },
  { name: "Tomás Ibarra",     initials: "TI", orders: 12, sales:  41680, ticket: 3473, conv: 71 },
];

export const NEXUM_AGING: AgingEntry[] = [
  { client: "Escuela Patria Nueva",   invoice: "FAC-2089", date: "2026-04-22", total: 4870,  b030: 4870, b3160:    0, b6190:    0, b90:     0 },
  { client: "Estudio Pliegue",        invoice: "FAC-2076", date: "2026-04-08", total: 1250,  b030:    0, b3160: 1250, b6190:    0, b90:     0 },
  { client: "Centro Cultural Río",    invoice: "FAC-2102", date: "2026-05-01", total:  320,  b030:  320, b3160:    0, b6190:    0, b90:     0 },
  { client: "Bufete Soriano y Asoc.", invoice: "FAC-1988", date: "2026-01-30", total: 12500, b030:    0, b3160:    0, b6190:    0, b90: 12500 },
  { client: "Mercería Las Flores",    invoice: "FAC-2055", date: "2026-03-12", total: 2340,  b030:    0, b3160:    0, b6190: 2340, b90:     0 },
];
