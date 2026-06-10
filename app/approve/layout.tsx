import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aprobación de diseño — Nexum",
  // El token de aprobación viaja en la URL: sin esto, el browser mandaría la
  // URL completa (token incluido) como Referer a Spaces/CDN al cargar el
  // preview firmado.
  referrer: "no-referrer",
};

export default function ApproveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
