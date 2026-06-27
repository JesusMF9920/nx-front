import type { ApiUser } from "@/lib/api/types";

/**
 * Selector de responsable de una etapa (diseño/producción). Controlado:
 * value = id del usuario o null ("Sin asignar"). La lista de usuarios la pasa
 * el padre (se carga una sola vez) para no disparar un fetch por cada select.
 */
export function AssigneeSelect({
  label,
  value,
  users,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  users: ApiUser[];
  disabled?: boolean;
  onChange: (userId: string | null) => void;
}) {
  return (
    <label className="field text-xs" style={{ gap: 4 }}>
      {label}
      <select
        className="select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Sin asignar</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
