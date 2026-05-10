import type { ReactNode } from "react";

type KvProps = {
  k: string;
  v: ReactNode;
  mono?: boolean;
};

export function Kv({ k, v, mono }: KvProps) {
  return (
    <div className="flex justify-between gap-4 text-[13px]">
      <span className="text-muted">{k}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}
