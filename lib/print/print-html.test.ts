// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { printHtmlInIframe } from "./print-html";

const HTML = "<!doctype html><html><body><p>ticket</p></body></html>";

// Timeouts a 0 para que el fallback de load/cleanup resuelva de inmediato en
// happy-dom (que no garantiza load para srcdoc).
const fastOpts = { loadTimeoutMs: 0, imageTimeoutMs: 0, cleanupTimeoutMs: 0 };

function wait(ms = 5): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

afterEach(() => {
  document.querySelectorAll("iframe").forEach((f) => f.remove());
});

describe("printHtmlInIframe", () => {
  it("monta un iframe oculto con el HTML en srcdoc e invoca onPrint", async () => {
    const onPrint = vi.fn();

    await printHtmlInIframe(HTML, { ...fastOpts, onPrint });

    expect(onPrint).toHaveBeenCalledTimes(1);
    const iframe = document.querySelector("iframe");
    // El iframe existe al momento de imprimir (la limpieza es posterior).
    expect(iframe?.srcdoc).toBe(HTML);
    expect(iframe?.style.visibility).toBe("hidden");
  });

  it("limpia el iframe vía el timeout de respaldo aunque afterprint no dispare", async () => {
    await printHtmlInIframe(HTML, { ...fastOpts, onPrint: vi.fn() });
    expect(document.querySelector("iframe")).not.toBeNull();

    await wait(10); // cleanupTimeoutMs=0 → siguiente macrotask
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("si onPrint lanza, el iframe se limpia y el error se propaga", async () => {
    const boom = new Error("printer on fire");

    await expect(
      printHtmlInIframe(HTML, {
        ...fastOpts,
        onPrint: () => {
          throw boom;
        },
      }),
    ).rejects.toBe(boom);
    expect(document.querySelector("iframe")).toBeNull();
  });
});
