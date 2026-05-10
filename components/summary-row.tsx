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
      style={{
        display: "flex",
        alignItems: "center",
        margin: "4px 0",
        fontSize: big ? 16 : 13,
        fontWeight: big ? 600 : 400,
        color: muted ? "var(--muted)" : "var(--ink)",
      }}
    >
      <span>{label}</span>
      <div style={{ flex: 1 }} />
      <span className={mono ? "num" : undefined}>{value}</span>
    </div>
  );
}
