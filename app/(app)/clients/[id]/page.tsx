import { redirect } from "next/navigation";

// Clientes usa master-detail dentro de `/clients` (no una ficha por ruta).
// Cualquier enlace canónico `/clients/<id>` (bookmarks o la búsqueda global
// previa) se redirige al panel de detalle vía query param, en vez de caer en
// el catch-all `[...slug]` ("Próximamente").
export default async function ClientRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clients?cliente=${encodeURIComponent(id)}`);
}
