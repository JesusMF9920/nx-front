"use client";

import { useState } from "react";
import {
  BASIC_COLORS,
  colorCodeFromLabel,
  hexForColorCode,
} from "@/lib/product-colors";

export type PickedColor = { code: string; label: string };

/** Punto de color; borde siempre visible para que el blanco se distinga. */
function Dot({ code, size = 14 }: { code: string; size?: number }) {
  const hex = hexForColorCode(code) ?? "transparent";
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: hex,
        border: "1px solid var(--line)",
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Selector de colores controlado: paleta de colores básicos (toggle) + entrada
 * de color personalizado + chips de lo elegido. `value`/`onChange` mantienen la
 * lista de {code,label} en el padre.
 */
export function ColorPalettePicker({
  value,
  onChange,
}: {
  value: PickedColor[];
  onChange: (next: PickedColor[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const has = (code: string) => value.some((c) => c.code === code);

  const toggle = (c: PickedColor) => {
    if (has(c.code)) onChange(value.filter((x) => x.code !== c.code));
    else onChange([...value, { code: c.code, label: c.label }]);
  };

  const addCustom = () => {
    const label = custom.trim();
    if (!label) return;
    const code = colorCodeFromLabel(label);
    if (code && !has(code)) onChange([...value, { code, label }]);
    setCustom("");
  };

  return (
    <div className="grid gap-2.5">
      {/* Paleta de colores básicos */}
      <div className="flex flex-wrap gap-1.5">
        {BASIC_COLORS.map((c) => {
          const active = has(c.code);
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={active}
              className="flex items-center gap-1.5 text-[12px]"
              style={{
                padding: "5px 9px",
                borderRadius: "var(--r-md)",
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: active ? "var(--accent-soft)" : "var(--surface)",
                color: active ? "var(--accent-ink)" : "var(--ink)",
                fontWeight: active ? 600 : 400,
              }}
            >
              <Dot code={c.code} />
              {c.label}
              {active && <span aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Color personalizado (fuera de la paleta) */}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Otro color (personalizado)…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          maxLength={40}
        />
        <button
          type="button"
          className="btn btn--sm"
          onClick={addCustom}
          disabled={!custom.trim()}
        >
          Agregar
        </button>
      </div>

      {/* Elegidos */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span key={c.code} className="tag flex items-center gap-1.5">
              <Dot code={c.code} size={11} />
              {c.label}
              <button
                type="button"
                className="text-muted hover:text-ink"
                aria-label={`Quitar ${c.label}`}
                onClick={() => onChange(value.filter((x) => x.code !== c.code))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
