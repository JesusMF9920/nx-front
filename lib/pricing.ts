import type { ApiPriceTier } from "@/lib/api/types";

/**
 * Precios de mayoreo por volumen (umbral simple "desde N"). Espejo de la
 * resolución autoritativa del backend (`PricingService.resolveBaseUnitPrice`):
 * el front lo usa SOLO para mostrar/orientar — el precio real lo calcula y
 * revalida el servidor en `preview`/checkout. Funciones puras, testeables.
 */

/**
 * Precio base unitario para una cantidad: el `unitPrice` del escalón con el
 * mayor `minQty <= qty`; si ninguno aplica (o no hay tiers), `basePrice`.
 * Acepta `qty` decimal (cantidad derivada de dimension: m²/lineal). No asume
 * que los tiers vengan ordenados (los ordena por seguridad).
 */
export function getPriceForQty(
  basePrice: number,
  tiers: ApiPriceTier[] | null | undefined,
  qty: number,
): number {
  if (!tiers || tiers.length === 0) return basePrice;
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let unit = basePrice;
  for (const tier of sorted) {
    if (qty >= tier.minQty) unit = tier.unitPrice;
    else break;
  }
  return unit;
}

/** ¿El producto tiene mayoreo configurado? */
export function hasPriceTiers(tiers: ApiPriceTier[] | null | undefined): boolean {
  return !!tiers && tiers.length > 0;
}

export type TierRange = { label: string; unitPrice: number; isBase: boolean };

/**
 * Rangos legibles para UI a partir del precio base + escalones:
 * `[{ "1–9", 55 }, { "10–49", 45 }, { "50+", 38 }]`. Sin tiers, devuelve
 * sólo el rango base `"1+"`.
 */
export function tierRanges(
  basePrice: number,
  tiers: ApiPriceTier[] | null | undefined,
): TierRange[] {
  if (!tiers || tiers.length === 0) {
    return [{ label: "1+", unitPrice: basePrice, isBase: true }];
  }
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const out: TierRange[] = [
    { label: `1–${sorted[0].minQty - 1}`, unitPrice: basePrice, isBase: true },
  ];
  sorted.forEach((tier, i) => {
    const next = sorted[i + 1];
    out.push({
      label: next ? `${tier.minQty}–${next.minQty - 1}` : `${tier.minQty}+`,
      unitPrice: tier.unitPrice,
      isBase: false,
    });
  });
  return out;
}
