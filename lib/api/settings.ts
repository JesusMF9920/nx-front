import { apiFetch } from "./client";
import type {
  ApiBusinessSettings,
  ApiFeatureFlag,
  ApiPresignUpload,
} from "./types";

/**
 * Tipos MIME aceptados para el logo — más estricto que storage (sin WebP/PDF):
 * el backend los rechaza porque pdfkit no los embebe en el ticket carta.
 */
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg"] as const;
export type LogoContentType = (typeof LOGO_CONTENT_TYPES)[number];
export const LOGO_ACCEPT = LOGO_CONTENT_TYPES.join(",");

export function isLogoContentType(t: string): t is LogoContentType {
  return (LOGO_CONTENT_TYPES as readonly string[]).includes(t);
}

export type BusinessSettingsPatch = Partial<{
  name: string;
  address: string | null;
  phone: string | null;
  rfc: string | null;
  email: string | null;
  logoKey: string | null;
  taxRegimen: string | null;
  postalCode: string | null;
  defaultClaveProdServ: string | null;
  defaultClaveUnidad: string | null;
  defaultObjetoImpuesto: string | null;
}>;

/**
 * Caché en memoria de los datos del negocio (los lee cada ticket térmico).
 * TTL 5 min < TTL 10 min de la URL presignada del logo: una entrada cacheada
 * nunca entrega una logoUrl ya vencida.
 */
const BUSINESS_CACHE_TTL_MS = 5 * 60 * 1000;
let businessCache: { value: ApiBusinessSettings; expiresAt: number } | null =
  null;

export const settingsApi = {
  getBusiness(): Promise<ApiBusinessSettings> {
    return apiFetch<ApiBusinessSettings>("/settings/business");
  },

  async getBusinessCached(): Promise<ApiBusinessSettings> {
    if (businessCache && businessCache.expiresAt > Date.now()) {
      return businessCache.value;
    }
    const value = await settingsApi.getBusiness();
    businessCache = { value, expiresAt: Date.now() + BUSINESS_CACHE_TTL_MS };
    return value;
  },

  invalidateBusinessCache(): void {
    businessCache = null;
  },

  async updateBusiness(
    patch: BusinessSettingsPatch,
  ): Promise<ApiBusinessSettings> {
    const value = await apiFetch<ApiBusinessSettings>("/settings/business", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    // El PATCH devuelve el estado fresco — re-sembrar la caché con él.
    businessCache = { value, expiresAt: Date.now() + BUSINESS_CACHE_TTL_MS };
    return value;
  },

  /** El backend genera el key (settings/logo-<uuid>.<ext>) y firma el PUT. */
  presignLogoUpload(contentType: LogoContentType): Promise<ApiPresignUpload> {
    return apiFetch<ApiPresignUpload>(
      "/settings/business/logo/presign-upload",
      { method: "POST", body: JSON.stringify({ contentType }) },
    );
  },

  listFeatures(): Promise<{ items: ApiFeatureFlag[] }> {
    return apiFetch<{ items: ApiFeatureFlag[] }>("/settings/features");
  },

  setFeature(
    key: string,
    enabled: boolean,
  ): Promise<{ key: string; enabled: boolean; updatedAt: string | null }> {
    return apiFetch(`/settings/features/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  },
};
