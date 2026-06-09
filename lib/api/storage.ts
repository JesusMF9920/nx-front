import { apiFetch } from "./client";
import type { ApiPresignDownload, ApiPresignUpload } from "./types";

/** Tipos MIME aceptados — debe coincidir con la allowlist del backend. */
export const UPLOAD_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

/** Valor para el atributo `accept` del input de archivo. */
export const UPLOAD_ACCEPT = UPLOAD_CONTENT_TYPES.join(",");

export function isUploadContentType(t: string): t is UploadContentType {
  return (UPLOAD_CONTENT_TYPES as readonly string[]).includes(t);
}

export const storageApi = {
  /** Pide al backend una URL firmada para subir un archivo de este tipo. */
  presignUpload(contentType: UploadContentType): Promise<ApiPresignUpload> {
    return apiFetch<ApiPresignUpload>("/storage/presign-upload", {
      method: "POST",
      body: JSON.stringify({ contentType }),
    });
  },

  /** Pide una URL firmada temporal para ver/descargar un objeto por su key. */
  presignDownload(key: string): Promise<ApiPresignDownload> {
    return apiFetch<ApiPresignDownload>(
      `/storage/presign-download?key=${encodeURIComponent(key)}`,
    );
  },

  /**
   * Sube el archivo directo a Spaces con la URL firmada (PUT). NO se manda el
   * header Authorization: la presigned URL ES la autorización y un Bearer
   * rompería la firma SigV4. El `Content-Type` debe coincidir con el firmado.
   */
  async upload(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) {
      throw new Error(`La subida al almacenamiento falló (HTTP ${res.status}).`);
    }
  },
};
