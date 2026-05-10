import type { Purchase } from "./types";

export const NEXUM_PURCHASES: Purchase[] = [
  {
    id: "OC-0422", date: "2026-05-08", supplier: "Textiles Bajío", items: 2, total: 14800,
    status: "Enviada", expected: "2026-05-12", buyer: "Mariana C.",
    lines: [
      { materialId: "m01", qty: 200, cost: 48 },
      { materialId: "m11", qty: 80,  cost: 65 },
    ],
  },
  {
    id: "OC-0421", date: "2026-05-06", supplier: "Insumos GR", items: 3, total: 9560,
    status: "Recibida", expected: "2026-05-06", buyer: "Mariana C.",
    lines: [
      { materialId: "m02", qty: 50,   cost: 95 },
      { materialId: "m03", qty: 2,    cost: 480 },
      { materialId: "m06", qty: 3000, cost: 1.2 },
    ],
  },
  {
    id: "OC-0420", date: "2026-05-05", supplier: "Textiles Bajío", items: 1, total: 3840,
    status: "Recibida", expected: "2026-05-05", buyer: "Mariana C.",
    lines: [{ materialId: "m01", qty: 80, cost: 48 }],
  },
  {
    id: "OC-0419", date: "2026-05-05", supplier: "Papelera Norte", items: 2, total: 6420,
    status: "Recibida parcial", expected: "2026-05-07", buyer: "Mariana C.",
    lines: [
      { materialId: "m09", qty: 500,  cost: 4.8, received: 500 },
      { materialId: "m10", qty: 2000, cost: 1.8, received: 1200 },
    ],
  },
  {
    id: "OC-0418", date: "2026-05-04", supplier: "Cerámicas MX", items: 1, total: 8800,
    status: "Enviada", expected: "2026-05-11", buyer: "Mariana C.",
    lines: [{ materialId: "m04", qty: 400, cost: 22 }],
  },
  {
    id: "OC-0417", date: "2026-05-03", supplier: "Lonas del Bajío", items: 1, total: 12600,
    status: "Enviada", expected: "2026-05-10", buyer: "Mariana C.", forOrder: "ORD-1842",
    lines: [{ materialId: null, name: "Lona 13oz frontlit 8 m²", qty: 8, cost: 48 }],
  },
  {
    id: "OC-0416", date: "2026-05-02", supplier: "Tintas Premium", items: 1, total: 3680,
    status: "Borrador", expected: "—", buyer: "Mariana C.",
    lines: [{ materialId: "m13", qty: 4, cost: 920 }],
  },
];
