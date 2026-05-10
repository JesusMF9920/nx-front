"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { fmtMXN } from "@/lib/format";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";
import type { ProductSource, Variant } from "@/lib/types";

type DraftVariantType = "none" | "size" | "preset" | "dimension";

const VARIANT_OPTIONS: { id: DraftVariantType; label: string; sub: string }[] = [
  { id: "none",      label: "Sin variantes", sub: "Producto único" },
  { id: "size",      label: "Tallas",        sub: "CH / M / G / EG" },
  { id: "preset",    label: "Medidas fijas", sub: "Lista predefinida" },
  { id: "dimension", label: "Medida libre",  sub: "Alto × ancho" },
];

export function NewProductForm() {
  const [source, setSource] = useState<ProductSource>("Interno");
  const [variantType, setVariantType] = useState<DraftVariantType>("none");
  const [variants, setVariants] = useState<Variant[]>([{ id: "v1", label: "", priceMod: 0, stock: 0 }]);

  const addVariant = () =>
    setVariants([...variants, { id: "v" + (variants.length + 1), label: "", priceMod: 0, stock: 0 }]);
  const removeVariant = (id: string) => setVariants(variants.filter((v) => v.id !== id));
  const updateVariant = <K extends keyof Variant>(id: string, key: K, val: Variant[K]) =>
    setVariants(variants.map((v) => (v.id === id ? { ...v, [key]: val } : v)));

  const gridCols = source === "Proveedor" ? "1fr 130px 130px 32px" : "1fr 130px 130px 100px 32px";

  return (
    <div className="grid grid-cols-2" style={{ gap: 14 }}>
      <div className="field col-span-full">
        <span className="label">Origen</span>
        <div className="flex gap-1.5">
          {(["Interno", "Proveedor"] as ProductSource[]).map((s) => (
            <button
              type="button"
              key={s}
              className={`btn btn--sm ${source === s ? "btn--primary" : ""}`}
              onClick={() => setSource(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="field"><span className="label">Nombre</span><input className="input" /></div>
      <div className="field"><span className="label">SKU</span><input className="input" placeholder="AUTO-…" /></div>
      <div className="field">
        <span className="label">Categoría</span>
        <select className="select">
          <option>Textil</option>
          <option>Promocional</option>
          <option>Papelería</option>
          <option>Gran formato</option>
          <option>Bordado</option>
        </select>
      </div>
      <div className="field">
        <span className="label">Método</span>
        <select className="select">
          <option>DTF</option>
          <option>Sublimación</option>
          <option>Serigrafía</option>
          <option>Bordado</option>
          <option>Digital</option>
          <option>Offset</option>
        </select>
      </div>
      <div className="field">
        <span className="label">Unidad</span>
        <select className="select">
          <option>pza</option>
          <option>m²</option>
          <option>millar</option>
          <option>juego</option>
        </select>
      </div>
      <div className="field"><span className="label">Tiempo de entrega (días)</span><input className="input" defaultValue="2" /></div>
      <div className="field"><span className="label">Precio base</span><input className="input" placeholder="0.00" /></div>
      <div className="field"><span className="label">Costo</span><input className="input" placeholder="0.00" /></div>

      {source === "Proveedor" && (
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <span className="label">Proveedor asignado</span>
          <select className="select">
            {NEXUM_SUPPLIERS.map((s) => (
              <option key={s.id}>
                {s.name} — {s.service}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field col-span-full mt-1">
        <span className="label">Tipo de variantes</span>
        <div className="grid grid-cols-4" style={{ gap: 6 }}>
          {VARIANT_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => setVariantType(o.id)}
              className="text-left rounded-md py-2 px-2.5 cursor-pointer"
              style={{
                border: variantType === o.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                background: variantType === o.id ? "var(--accent-soft)" : "var(--surface)",
                color: variantType === o.id ? "var(--accent-ink)" : "var(--ink)",
              }}
            >
              <div className="text-[13px] font-medium">{o.label}</div>
              <div
                className="text-[11px]"
                style={{ color: variantType === o.id ? "var(--accent-ink)" : "var(--muted)" }}
              >
                {o.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {(variantType === "size" || variantType === "preset") && (
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <span className="label">{variantType === "size" ? "Tallas disponibles" : "Medidas disponibles"}</span>
          {variantType === "size" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  setVariants([
                    { id: "CH", label: "CH", priceMod: 0,  stock: 0 },
                    { id: "M",  label: "M",  priceMod: 0,  stock: 0 },
                    { id: "G",  label: "G",  priceMod: 0,  stock: 0 },
                    { id: "EG", label: "EG", priceMod: 15, stock: 0 },
                  ])
                }
              >
                Cargar adulto (CH–EG)
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  setVariants([
                    { id: "2", label: "2", priceMod: 0, stock: 0 },
                    { id: "4", label: "4", priceMod: 0, stock: 0 },
                    { id: "6", label: "6", priceMod: 0, stock: 0 },
                    { id: "8", label: "8", priceMod: 0, stock: 0 },
                  ])
                }
              >
                Cargar infantil
              </button>
            </div>
          )}
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                padding: "8px 10px",
                background: "var(--surface-2)",
                fontSize: 11,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                borderBottom: "1px solid var(--line)",
                gap: 8,
              }}
            >
              <span>Etiqueta</span>
              <span style={{ textAlign: "right" }}>± Modificador</span>
              <span style={{ textAlign: "right" }}>Precio final</span>
              {source !== "Proveedor" && <span style={{ textAlign: "right" }}>Stock</span>}
              <span />
            </div>
            {variants.map((v) => (
              <div
                key={v.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  className="input"
                  value={v.label}
                  onChange={(e) => updateVariant(v.id, "label", e.target.value)}
                  placeholder={variantType === "size" ? "M" : "5×8 cm"}
                />
                <input
                  className="input num"
                  value={v.priceMod}
                  type="number"
                  onChange={(e) => updateVariant(v.id, "priceMod", parseFloat(e.target.value || "0"))}
                  style={{ textAlign: "right" }}
                />
                <span className="num" style={{ textAlign: "right", color: "var(--muted)", fontSize: 12 }}>
                  +{fmtMXN(v.priceMod)}
                </span>
                {source !== "Proveedor" && (
                  <input
                    className="input num"
                    value={v.stock}
                    type="number"
                    onChange={(e) => updateVariant(v.id, "stock", parseInt(e.target.value || "0", 10))}
                    style={{ textAlign: "right" }}
                  />
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeVariant(v.id)}
                  style={{ width: 24, height: 24, color: "var(--muted)", border: 0 }}
                  aria-label="Eliminar variante"
                >
                  {I.x}
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 6, alignSelf: "start" }} onClick={addVariant}>
            {I.plus} Añadir {variantType === "size" ? "talla" : "medida"}
          </button>
          <div className="help">
            El modificador se suma al precio base. Déjalo en 0 si todas las opciones cuestan igual.
          </div>
        </div>
      )}

      {variantType === "dimension" && (
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <span className="label">Configuración de medida libre</span>
          <div
            style={{
              padding: 12,
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--surface-2)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <div className="field">
              <span className="label">Unidad</span>
              <select className="select">
                <option>cm</option>
                <option>m</option>
                <option>pulgadas</option>
              </select>
            </div>
            <div className="field"><span className="label">Mín.</span><input className="input num" defaultValue="0.5" /></div>
            <div className="field"><span className="label">Máx.</span><input className="input num" defaultValue="12" /></div>
            <div className="field">
              <span className="label">Cobro</span>
              <select className="select">
                <option>Por m² (área)</option>
                <option>Por metro lineal</option>
                <option>Tarifa fija + suplemento</option>
              </select>
            </div>
          </div>
          <div className="help">El cajero capturará alto y ancho en el POS. El precio se calcula automáticamente.</div>
        </div>
      )}

      <label style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input type="checkbox" defaultChecked /> Requiere aprobación de diseño por parte del cliente
      </label>
    </div>
  );
}
