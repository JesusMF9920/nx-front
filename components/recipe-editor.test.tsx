// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeEditor, type RecipeRow } from "./recipe-editor";

afterEach(cleanup);

const row = (over: Partial<RecipeRow> = {}): RecipeRow => ({
  materialId: "mat-1",
  materialName: "Playera",
  materialSku: "MAT-PLY",
  materialUnit: "pza",
  qty: "1",
  byVariant: false,
  note: "",
  ...over,
});

const byVariantBox = () =>
  screen.getByLabelText(/por variante/i) as HTMLInputElement;

describe("RecipeEditor — casilla 'por variante'", () => {
  // Sólo sized_from_material manda el desglose por talla al vender; en otro
  // tipo el backend rechaza la receta y el producto queda invendible.
  it("editable cuando el producto es sized_from_material", () => {
    render(
      <RecipeEditor
        rows={[row()]}
        onChange={vi.fn()}
        variantType="sized_from_material"
      />,
    );
    expect(byVariantBox().disabled).toBe(false);
  });

  it("bloqueada en cualquier otro tipo", () => {
    for (const type of ["none", "size", "preset", "dimension"]) {
      render(<RecipeEditor rows={[row()]} onChange={vi.fn()} variantType={type} />);
      expect(byVariantBox().disabled).toBe(true);
      cleanup();
    }
  });

  it("bloqueada si no se informa el tipo (sin suposiciones)", () => {
    render(<RecipeEditor rows={[row()]} onChange={vi.fn()} />);
    expect(byVariantBox().disabled).toBe(true);
  });

  // Escape para datos viejos: si ya viene marcada en un producto que no la
  // admite, hay que poder DESmarcarla — es justo el arreglo.
  it("una fila ya marcada se puede desmarcar aunque el tipo no la admita", () => {
    render(
      <RecipeEditor
        rows={[row({ byVariant: true })]}
        onChange={vi.fn()}
        variantType="none"
      />,
    );
    const box = byVariantBox();
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(false);
  });
});
