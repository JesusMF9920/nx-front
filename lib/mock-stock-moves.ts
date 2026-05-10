import type { StockMove } from "./types";

export const NEXUM_STOCK_MOVES: StockMove[] = [
  { id: "MOV-3098", date: "2026-05-06 14:22", type: "salida",  materialId: "m01", qty: -40,  ref: "ORD-1842", note: "Consumo venta · Playera DTF (40 pzas)", user: "Diego Fuentes" },
  { id: "MOV-3097", date: "2026-05-06 14:22", type: "salida",  materialId: "m02", qty: -16,  ref: "ORD-1842", note: "Consumo venta · Film DTF",              user: "Diego Fuentes" },
  { id: "MOV-3096", date: "2026-05-06 14:22", type: "salida",  materialId: "m03", qty: -1.0, ref: "ORD-1842", note: "Consumo venta · Polvo hot-melt",       user: "Diego Fuentes" },
  { id: "MOV-3095", date: "2026-05-06 14:22", type: "salida",  materialId: "m04", qty: -40,  ref: "ORD-1842", note: "Consumo venta · Vasos cerámicos",      user: "Diego Fuentes" },
  { id: "MOV-3094", date: "2026-05-06 11:08", type: "entrada", materialId: "m02", qty: 50,   ref: "OC-0421",  note: "Compra · Insumos GR",                  user: "Mariana Castillo" },
  { id: "MOV-3093", date: "2026-05-06 11:08", type: "entrada", materialId: "m03", qty: 2,    ref: "OC-0421",  note: "Compra · Insumos GR",                  user: "Mariana Castillo" },
  { id: "MOV-3092", date: "2026-05-05 18:40", type: "ajuste",  materialId: "m05", qty: -25,  ref: "AJ-014",   note: "Merma · cabezal manchó hojas",         user: "Alma Reyes" },
  { id: "MOV-3091", date: "2026-05-05 16:12", type: "salida",  materialId: "m09", qty: -250, ref: "ORD-1840", note: "Consumo venta · Tarjetas",             user: "Diego Fuentes" },
  { id: "MOV-3090", date: "2026-05-05 09:55", type: "entrada", materialId: "m01", qty: 80,   ref: "OC-0420",  note: "Compra · Textiles Bajío",              user: "Mariana Castillo" },
  { id: "MOV-3089", date: "2026-05-04 17:30", type: "salida",  materialId: "m10", qty: -250, ref: "ORD-1837", note: "Consumo venta · Volantes",             user: "Diego Fuentes" },
];
