import type { Quote } from "./types";

export const NEXUM_QUOTES: Quote[] = [
  { id: "COT-1057", date: "2026-05-08", client: "Sindicato Magisterial 42", items: 3, total: 18450, status: "Enviada",    validUntil: "2026-05-23", seller: "Mariana C.", notes: "Cliente pidió comparar contra DTF.",  channel: "WhatsApp" },
  { id: "COT-1056", date: "2026-05-07", client: "Cooperativa El Roble",    items: 5, total: 32890, status: "Aprobada",   validUntil: "2026-05-22", seller: "Mariana C.", notes: "Convertir a pedido el lunes.",        channel: "Correo" },
  { id: "COT-1055", date: "2026-05-07", client: "Restaurante La Milpa",    items: 2, total:  6740, status: "Enviada",    validUntil: "2026-05-22", seller: "Diego F.",   notes: "Esperan validar logotipo final.",     channel: "Link" },
  { id: "COT-1054", date: "2026-05-06", client: "Escuela Patria Nueva",    items: 4, total: 24300, status: "Convertida", validUntil: "2026-05-21", seller: "Mariana C.", notes: "→ ORD-1841",                          channel: "Correo" },
  { id: "COT-1053", date: "2026-05-05", client: "Estudio Pliegue",         items: 1, total:  3850, status: "Enviada",    validUntil: "2026-05-20", seller: "Diego F.",   notes: "",                                    channel: "WhatsApp" },
  { id: "COT-1052", date: "2026-05-04", client: "Café Aurora",             items: 6, total: 41200, status: "Convertida", validUntil: "2026-05-19", seller: "Mariana C.", notes: "→ ORD-1842",                          channel: "Link" },
  { id: "COT-1051", date: "2026-05-03", client: "Mercería Las Flores",     items: 2, total:  9870, status: "Rechazada",  validUntil: "2026-05-18", seller: "Diego F.",   notes: "Cliente prefirió a competencia.",     channel: "Presencial" },
  { id: "COT-1050", date: "2026-05-02", client: "Bufete Soriano y Asoc.",  items: 1, total: 12500, status: "Vencida",    validUntil: "2026-05-09", seller: "Mariana C.", notes: "Vigencia expirada.",                  channel: "Correo" },
];
