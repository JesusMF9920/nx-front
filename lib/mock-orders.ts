import type { Approval, Delivery, Order } from "./types";

export const NEXUM_ORDERS: Order[] = [
  { id: "ORD-1842", date: "2026-05-06", client: "Café Aurora",            clientId: "c1", total: 2450.00, paid: 2450.00, payment: "Efectivo", status: "En diseño",          deliver: "2026-05-08", items: 2 },
  { id: "ORD-1841", date: "2026-05-06", client: "Escuela Patria Nueva",   clientId: "c4", total: 8970.00, paid: 4485.00, payment: "Mixto",    status: "Producción",         deliver: "2026-05-09", items: 4 },
  { id: "ORD-1840", date: "2026-05-05", client: "Estudio Pliegue",        clientId: "c2", total: 1180.00, paid: 1180.00, payment: "Terminal", status: "Aprobación cliente", deliver: "2026-05-08", items: 1 },
  { id: "ORD-1839", date: "2026-05-05", client: "Centro Cultural Río",    clientId: "c7", total: 3420.00, paid: 3420.00, payment: "Terminal", status: "Listo para entrega", deliver: "2026-05-07", items: 3 },
  { id: "ORD-1838", date: "2026-05-04", client: "Maritza Domínguez",      clientId: "c3", total: 450.00,  paid: 450.00,  payment: "Efectivo", status: "Entregado",          deliver: "2026-05-06", items: 1 },
  { id: "ORD-1837", date: "2026-05-04", client: "Mercería Las Flores",    clientId: "c5", total: 760.00,  paid: 0,       payment: "Pendiente", status: "Aprobación cliente", deliver: "2026-05-08", items: 2 },
  { id: "ORD-1836", date: "2026-05-03", client: "Despacho Salinas y Asoc.", clientId: "c8", total: 1900.00, paid: 1900.00, payment: "Terminal", status: "Producción",         deliver: "2026-05-09", items: 1 },
  { id: "ORD-1835", date: "2026-05-03", client: "Joaquín Vargas Cortés",  clientId: "c6", total: 320.00,  paid: 320.00,  payment: "Efectivo", status: "Entregado",          deliver: "2026-05-05", items: 1 },
];

export const NEXUM_DELIVERIES_BY_DAY: Record<string, Delivery[]> = {
  "2026-05-07": [
    { id: "ORD-1839", client: "Centro Cultural Río", items: "3 productos", time: "11:00", status: "Listo para entrega", supplier: false },
  ],
  "2026-05-08": [
    { id: "ORD-1842", client: "Café Aurora",         items: "Playeras x40, vasos x40", time: "10:00", status: "En diseño",          supplier: false },
    { id: "ORD-1840", client: "Estudio Pliegue",     items: "Tarjetas (2 millares)",   time: "14:00", status: "Aprobación cliente", supplier: false },
    { id: "ORD-1837", client: "Mercería Las Flores", items: "Volantes (1 millar)",     time: "16:30", status: "Aprobación cliente", supplier: false },
  ],
  "2026-05-09": [
    { id: "ORD-1841", client: "Escuela Patria Nueva",     items: "Playeras x120",      time: "09:00", status: "Producción",   supplier: false },
    { id: "ORD-1836", client: "Despacho Salinas y Asoc.", items: "Sello automático",   time: "12:00", status: "Producción",   supplier: true },
    { id: "ORD-1843", client: "Pastelería Belluno",       items: "Lona 4×2 m frontlit",time: "17:00", status: "Con proveedor",supplier: true },
  ],
  "2026-05-10": [],
  "2026-05-11": [
    { id: "ORD-1844", client: "Gimnasio FlexCore", items: "Parches bordados x60",   time: "11:00", status: "Con proveedor", supplier: true },
    { id: "ORD-1845", client: "Café Aurora",       items: "Bolsas ecológicas x80",  time: "13:00", status: "En diseño",     supplier: false },
  ],
  "2026-05-12": [
    { id: "ORD-1846", client: "Restaurante Mistral", items: "Menú impreso (300)", time: "10:00", status: "En diseño", supplier: false },
  ],
  "2026-05-13": [],
};

export const NEXUM_APPROVALS: Approval[] = [
  { id: "APR-2241", order: "ORD-1840", client: "Estudio Pliegue",      product: "Tarjeta presentación couché",     version: 3, sent: "2026-05-05", channel: "Link",     status: "Esperando cliente",   note: "Ajustamos espaciado del logotipo" },
  { id: "APR-2240", order: "ORD-1842", client: "Café Aurora",          product: "Playera blanca DTF",              version: 1, sent: "2026-05-06", channel: "WhatsApp", status: "Esperando cliente",   note: "Primera propuesta" },
  { id: "APR-2239", order: "ORD-1842", client: "Café Aurora",          product: "Vaso cerámico sublimado 11oz",    version: 1, sent: "2026-05-06", channel: "Link",     status: "Esperando cliente",   note: "" },
  { id: "APR-2238", order: "ORD-1837", client: "Mercería Las Flores",  product: "Volante 1/4 carta",               version: 2, sent: "2026-05-04", channel: "Link",     status: "Cambios solicitados", note: "Cliente pide cambiar tipografía" },
  { id: "APR-2237", order: "ORD-1841", client: "Escuela Patria Nueva", product: "Playera serigrafía",              version: 4, sent: "2026-05-04", channel: "WhatsApp", status: "Aprobado",            note: "Aprobado por Lic. Ruiz" },
];
