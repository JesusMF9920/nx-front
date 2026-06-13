/**
 * Descarga un recurso del API como archivo (CSV/blob) disparando la descarga del
 * navegador. Usa la cookie httpOnly de sesión (`credentials: "include"`).
 */
export async function downloadFile(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`La descarga falló: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Diferir la revocación: revocar síncrono tras click() puede abortar la
  // descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
