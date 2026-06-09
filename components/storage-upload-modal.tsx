"use client";

import { useRef, useState } from "react";
import { Modal } from "./modal";
import {
  isUploadContentType,
  storageApi,
  UPLOAD_ACCEPT,
} from "@/lib/api/storage";

type Phase = "idle" | "uploading" | "done";

/**
 * POC de almacenamiento: elige un archivo → el backend firma una URL → el
 * browser sube el archivo directo a DigitalOcean Spaces (PUT) → el backend
 * firma una URL de lectura → se previsualiza. No persiste nada en la base; es
 * la validación de extremo a extremo de Spaces (Fase F lo cablea a las pruebas
 * de diseño reales).
 */
export function StorageUploadModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [objectKey, setObjectKey] = useState<string | null>(null);

  const busy = phase === "uploading";

  function pick(f: File | null) {
    setError(null);
    setPreviewUrl(null);
    setObjectKey(null);
    setPhase("idle");
    if (f && !isUploadContentType(f.type)) {
      setFile(null);
      setError("Tipo no permitido. Usa PNG, JPG, WebP o PDF.");
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file || busy) return;
    if (!isUploadContentType(file.type)) {
      setError("Tipo no permitido. Usa PNG, JPG, WebP o PDF.");
      return;
    }
    setPhase("uploading");
    setError(null);
    try {
      const { key, uploadUrl } = await storageApi.presignUpload(file.type);
      await storageApi.upload(uploadUrl, file);
      const { downloadUrl } = await storageApi.presignDownload(key);
      setObjectKey(key);
      setPreviewUrl(downloadUrl);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }

  const isPdf = file?.type === "application/pdf";

  return (
    <Modal
      title="Subir diseño (POC de almacenamiento)"
      onClose={busy ? () => undefined : onClose}
      width={520}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cerrar
          </button>
          <button
            className="btn btn--accent"
            type="button"
            onClick={handleUpload}
            disabled={!file || busy || phase === "done"}
          >
            {busy ? "Subiendo…" : phase === "done" ? "Subido ✓" : "Subir a Spaces"}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-2">
        Prueba de extremo a extremo del almacenamiento: el archivo se sube
        directo a DigitalOcean Spaces con una URL firmada y se previsualiza con
        otra URL firmada temporal. Todavía no se guarda en la base.
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        hidden
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      <div className="mt-4 flex items-center gap-2">
        <button
          className="btn"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Elegir archivo…
        </button>
        <span className="text-muted text-xs truncate">
          {file ? file.name : "PNG, JPG, WebP o PDF"}
        </span>
      </div>

      {previewUrl && (
        <div className="mt-4">
          {isPdf ? (
            <a
              className="btn btn--sm"
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir PDF subido
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada remota con query de firma; next/image no aplica
            <img
              src={previewUrl}
              alt="Vista previa del diseño subido"
              style={{
                maxWidth: "100%",
                maxHeight: 320,
                borderRadius: 8,
                border: "1px solid var(--line)",
              }}
            />
          )}
          {objectKey && (
            <div className="num text-[11px] text-muted mt-2 truncate">
              key: {objectKey}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="rounded-md text-xs mt-3"
          style={{
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}
    </Modal>
  );
}
