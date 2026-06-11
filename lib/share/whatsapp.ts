import { fmtMXN } from "@/lib/format";

/**
 * Links wa.me prellenados (Fase G.3) — sin API de WhatsApp: el navegador abre
 * WhatsApp (app o web) con el destinatario y el mensaje listos. Funciones
 * puras, testeables con Vitest.
 */

const DATE_ES = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/**
 * Normaliza un teléfono mexicano al formato que exige wa.me: solo dígitos con
 * código de país, sin `+` ni espacios. 10 dígitos (formato local) → prefijo
 * 52; si ya viene con 52/521 se respeta (el 521 legacy sigue siendo válido).
 * Devuelve null si el número no es utilizable — el caller cae al selector de
 * contactos de WhatsApp.
 */
export function normalizeMxPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 13 && digits.startsWith("521")) return digits;
  return null;
}

/**
 * URL wa.me con el texto prellenado. Sin teléfono utilizable, `wa.me/?text=…`
 * abre WhatsApp con el mensaje y el usuario elige el contacto.
 */
export function buildWaMeUrl(
  phone: string | null | undefined,
  text: string,
): string {
  const normalized = normalizeMxPhone(phone);
  const encoded = encodeURIComponent(text);
  return normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function buildQuoteWhatsappMessage(args: {
  businessName: string;
  clientName: string;
  folio: string;
  total: number;
  validUntil: string | null;
}): string {
  const vigencia = args.validUntil
    ? ` Vigente hasta el ${DATE_ES.format(new Date(args.validUntil))}.`
    : "";
  // Sin emojis: el redirect de wa.me corrompe caracteres de 4 bytes (U+FFFD).
  return (
    `Hola ${args.clientName}:\n` +
    `Te compartimos tu cotización ${args.folio} de ${args.businessName} ` +
    `por un total de ${fmtMXN(args.total)}.${vigencia}\n` +
    `¿Te la enviamos en PDF por correo o tienes alguna duda?`
  );
}

export function buildProofWhatsappMessage(args: {
  businessName: string;
  clientName: string;
  version: number;
  url: string;
  expiresAt: string;
}): string {
  // Sin emojis: el redirect de wa.me corrompe caracteres de 4 bytes (U+FFFD).
  return (
    `Hola ${args.clientName}:\n` +
    `Tu diseño (versión ${args.version}) de ${args.businessName} está listo ` +
    `para revisión. Apruébalo o pide cambios aquí:\n${args.url}\n` +
    `El enlace vence el ${DATE_ES.format(new Date(args.expiresAt))}.`
  );
}
