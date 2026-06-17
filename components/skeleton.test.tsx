// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Skeleton, SkeletonTable, SkeletonText } from "./skeleton";

afterEach(cleanup);

describe("Skeleton", () => {
  it("el bloque base es aria-hidden y aplica width/height", () => {
    const { container } = render(<Skeleton width={120} height={20} />);
    const el = container.querySelector(".skeleton") as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("20px");
  });

  it("SkeletonTable anuncia carga (role=status + sr-only) y dibuja rows×cols", () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Cargando…")).toBeTruthy();
    expect(container.querySelectorAll(".skeleton-table__row")).toHaveLength(3);
    expect(container.querySelectorAll(".skeleton-table__row .skeleton")).toHaveLength(
      12,
    );
  });

  it("SkeletonText dibuja N líneas", () => {
    const { container } = render(<SkeletonText lines={5} />);
    expect(container.querySelectorAll(".skeleton")).toHaveLength(5);
  });
});
