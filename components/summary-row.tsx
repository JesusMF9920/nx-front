import type { ReactNode } from "react";

type SummaryRowProps = {
  label: string;
  value: ReactNode;
  /** Greys out the whole row — for "Descuento" or zero balances. */
  muted?: boolean;
  /** Larger font + weight — for the bottom Total row. */
  big?: boolean;
  /** Monospace + tabular numerals for the value. Defaults to true. */
  mono?: boolean;
};

export function SummaryRow({ label, value, muted, big, mono = true }: SummaryRowProps) {
  return (
    <div
      className={`flex items-center my-1 ${big ? "text-base font-semibold" : "text-[13px]"}`}
      style={{ color: muted ? "var(--muted)" : "var(--ink)" }}
    >
      <span>{label}</span>
      <div className="flex-1" />
      <span className={mono ? "num" : undefined}>{value}</span>
    </div>
  );
}
