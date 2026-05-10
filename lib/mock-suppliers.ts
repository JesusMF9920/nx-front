import type { Supplier } from "./types";

export const NEXUM_SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Lonas del Bajío", service: "Lonas y vinil",    leadDays: 2, lastOrder: "2026-05-03", reliability: 96 },
  { id: "s2", name: "Bordados Norte",  service: "Bordado y parche", leadDays: 5, lastOrder: "2026-04-28", reliability: 92 },
  { id: "s3", name: "Fotograbado MX",  service: "Placas y sellos",  leadDays: 3, lastOrder: "2026-05-01", reliability: 99 },
];
