import { Icon } from "./icons";

type PermRowProps = {
  label: string;
  on: boolean;
};

export function PermRow({ label, on }: PermRowProps) {
  return (
    <div
      className="flex items-center gap-2 text-[13px] py-1.5"
      style={{ color: on ? "var(--ink)" : "var(--muted-2)" }}
    >
      <span
        className="rounded grid place-items-center text-white"
        style={{
          width: 14,
          height: 14,
          background: on ? "var(--ok)" : "var(--surface-3)",
        }}
      >
        {on ? <Icon d="M5 12l5 5 9-11" size={10} stroke={3} /> : null}
      </span>
      {label}
    </div>
  );
}
