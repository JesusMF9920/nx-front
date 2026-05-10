import type { ReactNode } from "react";

type KvProps = {
  k: string;
  v: ReactNode;
  mono?: boolean;
};

export function Kv({ k, v, mono }: KvProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span style={{ fontFamily: mono ? "var(--font-mono)" : "inherit", textAlign: "right" }}>{v}</span>
    </div>
  );
}
