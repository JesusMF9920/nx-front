import type { Client } from "./types";

export const NEXUM_CLIENTS: Client[] = [
  { id: "c1", name: "Café Aurora",              type: "Negocio", contact: "Ana Salgado",        phone: "55 4421 9087", email: "ana@cafeaurora.mx",        rfc: "CAU210512AB1",  balance: 0,       orders: 14, lastOrder: "2026-05-04", tags: ["Frecuente", "Mayoreo"] },
  { id: "c2", name: "Estudio Pliegue",          type: "Negocio", contact: "Renato Vidal",       phone: "55 1290 8722", email: "hola@pliegue.studio",       rfc: "EPL190802XX0",  balance: 1250.00, orders: 8,  lastOrder: "2026-05-02", tags: ["Frecuente"] },
  { id: "c3", name: "Maritza Domínguez",        type: "Persona", contact: "Maritza Domínguez",  phone: "55 9088 4421", email: "mari.dom@gmail.com",        rfc: "DOMM850714T22", balance: 0,       orders: 3,  lastOrder: "2026-04-29", tags: [] },
  { id: "c4", name: "Escuela Patria Nueva",     type: "Negocio", contact: "Lic. Pablo Ruiz",    phone: "55 6612 0098", email: "compras@patrianueva.edu.mx", rfc: "EPN051110LM4",  balance: 4870.00, orders: 22, lastOrder: "2026-05-05", tags: ["Crédito 30", "VIP"] },
  { id: "c5", name: "Mercería Las Flores",      type: "Negocio", contact: "Lupita Reyna",       phone: "55 3309 1187", email: "lasflores@gmail.com",       rfc: "MLF120303BB1",  balance: 0,       orders: 5,  lastOrder: "2026-04-12", tags: [] },
  { id: "c6", name: "Joaquín Vargas Cortés",    type: "Persona", contact: "Joaquín Vargas",     phone: "55 1144 7732", email: "jvargasc@outlook.com",      rfc: "VACJ900512Q33", balance: 0,       orders: 1,  lastOrder: "2026-03-21", tags: [] },
  { id: "c7", name: "Centro Cultural Río",      type: "Negocio", contact: "Itzel Aguirre",      phone: "55 8821 0090", email: "itzel@ccrio.org",           rfc: "CCR110923YY7",  balance: 320.00,  orders: 11, lastOrder: "2026-05-01", tags: ["Frecuente"] },
  { id: "c8", name: "Despacho Salinas y Asoc.", type: "Negocio", contact: "Lic. Mario Salinas", phone: "55 3322 9911", email: "ms@salinas.legal",          rfc: "DSA170201HH2",  balance: 0,       orders: 6,  lastOrder: "2026-04-22", tags: ["Crédito 15"] },
];
