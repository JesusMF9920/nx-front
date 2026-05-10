import type { ReactNode } from "react";
import { I } from "@/components/icons";
import type { Order } from "@/lib/types";

const MAP: Record<Order["payment"], { cls: string; icon: ReactNode; label: string }> = {
  Efectivo:  { cls: "pill--neutral", icon: I.cash,   label: "Efectivo" },
  Terminal:  { cls: "pill--info",    icon: I.card,   label: "Terminal" },
  Mixto:     { cls: "pill--accent",  icon: I.layers, label: "Mixto" },
  Pendiente: { cls: "pill--danger",  icon: I.clock,  label: "Pendiente" },
};

export function PaymentPill({ method }: { method: Order["payment"] }) {
  const { cls, icon, label } = MAP[method];
  return (
    <span className={`pill ${cls}`}>
      {icon}
      {label}
    </span>
  );
}
