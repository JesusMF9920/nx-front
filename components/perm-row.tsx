import { Icon } from "./icons";

type PermRowProps = {
  label: string;
  on: boolean;
};

export function PermRow({ label, on }: PermRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        padding: "6px 0",
        color: on ? "var(--ink)" : "var(--muted-2)",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: on ? "var(--ok)" : "var(--surface-3)",
          color: "white",
          display: "grid",
          placeItems: "center",
        }}
      >
        {on ? <Icon d="M5 12l5 5 9-11" size={10} stroke={3} /> : null}
      </span>
      {label}
    </div>
  );
}
