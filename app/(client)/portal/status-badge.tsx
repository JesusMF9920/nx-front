import type { ClientOrderStatus } from "@/lib/api/client-portal/types";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";

/** Badge de estatus del pedido en el portal (etiqueta ES compartida con staff). */
export function StatusBadge({ status }: { status: ClientOrderStatus }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
      {ORDER_STATUS_ES[status]}
    </span>
  );
}
