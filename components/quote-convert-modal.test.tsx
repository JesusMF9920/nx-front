// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { quotesApi, type ConvertPreviewResult } from "@/lib/api/quotes";
import type { ApiQuoteDetail } from "@/lib/api/types";
import { ToastProvider } from "@/lib/toast/toast-context";
import { QuoteConvertModal } from "./quote-convert-modal";

vi.mock("@/lib/api/quotes", () => ({
  quotesApi: {
    convertPreview: vi.fn(),
    convert: vi.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Sólo se leen id/total/folio/subtotal/discount/tax/isExpired del quote.
const quote = {
  id: "q1",
  folio: "COT-001",
  total: 1000,
  subtotal: 862.07,
  discount: 0,
  tax: 137.93,
  isExpired: false,
} as unknown as ApiQuoteDetail;

function renderModal() {
  return render(
    <ToastProvider>
      <QuoteConvertModal quote={quote} onClose={() => {}} onConverted={() => {}} />
    </ToastProvider>,
  );
}

function generateBtn(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Generar pedido/ }) as HTMLButtonElement;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.style.overflow = "";
});

describe("QuoteConvertModal — bloqueo del CTA", () => {
  it("mantiene 'Generar pedido' deshabilitado mientras carga el preview", async () => {
    const preview = deferred<ConvertPreviewResult>();
    vi.mocked(quotesApi.convertPreview).mockReturnValue(preview.promise);

    renderModal();

    // previewLoading arranca en true → el botón está deshabilitado durante la carga.
    expect(generateBtn().disabled).toBe(true);

    await act(async () => {
      preview.resolve({ toPurchase: [], shortages: [], available: true });
    });

    // Preview disponible → el botón se habilita.
    expect(generateBtn().disabled).toBe(false);
  });

  it("re-bloquea el CTA tras un convert fallido re-derivando el preview", async () => {
    const first = deferred<ConvertPreviewResult>();
    const second = deferred<ConvertPreviewResult>();
    vi.mocked(quotesApi.convertPreview)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    // Receta rota al convertir ⇒ error de inventory (404), NO un 409.
    vi.mocked(quotesApi.convert).mockRejectedValue(
      new ApiError(404, "Material o talla inexistente", {
        error: "MaterialNotFoundError",
      }),
    );

    renderModal();

    await act(async () => {
      first.resolve({ toPurchase: [], shortages: [], available: true });
    });
    expect(generateBtn().disabled).toBe(false);

    // Confirmar: el convert falla y el catch re-ejecuta loadPreview (previewLoading=true).
    await act(async () => {
      fireEvent.click(generateBtn());
    });
    expect(generateBtn().disabled).toBe(true);

    // El re-chequeo marca available=false (receta rota) → previewBlocked.
    await act(async () => {
      second.resolve({
        toPurchase: [],
        shortages: [
          {
            materialId: "m1",
            materialName: "Tela",
            materialVariantCode: null,
            unit: "m",
            required: 2,
            available: 0,
            missing: true,
          },
        ],
        available: false,
      });
    });

    expect(generateBtn().disabled).toBe(true);
    expect(screen.getByText(/Receta incompleta/)).toBeTruthy();
  });
});
