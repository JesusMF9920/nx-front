import type { ApiStockShortage } from "./types";

export type ApiErrorBody = {
  message?: string | string[];
  /**
   * Nombre de la clase de error del backend — es el discriminador real de los
   * 409 de sales (p.ej. "InsufficientStockForSaleError", "TotalsMismatchError",
   * "PaymentExceedsTotalError"); el filtro NO emite `code`.
   */
  error?: string;
  statusCode?: number;
  code?: string;
  /** Solo presente cuando error === "InsufficientStockForSaleError". */
  shortages?: ApiStockShortage[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    const raw = body?.message;
    const message = Array.isArray(raw)
      ? raw.join(", ")
      : raw ?? body?.error ?? `HTTP ${res.status}`;
    return new ApiError(res.status, message, body);
  }
}
