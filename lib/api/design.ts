import { apiFetch } from "./client";
import type {
  ApiApprovalChannel,
  ApiDesignProofDetail,
  ApiDesignProofListItem,
  ApiDesignProofStatus,
  ApiPresignUpload,
  ApiProofDownload,
  ApiPublicApproval,
  ApiSendProofResult,
} from "./types";

/** Tipos MIME aceptados para pruebas — espejo de la allowlist del backend. */
export const PROOF_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type ProofContentType = (typeof PROOF_CONTENT_TYPES)[number];

export const PROOF_ACCEPT = PROOF_CONTENT_TYPES.join(",");

export function isProofContentType(t: string): t is ProofContentType {
  return (PROOF_CONTENT_TYPES as readonly string[]).includes(t);
}

export const designApi = {
  list(
    status?: ApiDesignProofStatus,
  ): Promise<{ items: ApiDesignProofListItem[] }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiFetch<{ items: ApiDesignProofListItem[] }>(
      `/design/proofs${qs}`,
    );
  },

  /** Acepta UUID o folio (APR-1001). */
  get(idOrFolio: string): Promise<ApiDesignProofDetail> {
    return apiFetch<ApiDesignProofDetail>(`/design/proofs/${idOrFolio}`);
  },

  create(input: { orderId: string; itemId: string }): Promise<{
    id: string;
    folio: string;
  }> {
    return apiFetch<{ id: string; folio: string }>("/design/proofs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  presignUpload(
    proofId: string,
    contentType: ProofContentType,
  ): Promise<ApiPresignUpload> {
    return apiFetch<ApiPresignUpload>(
      `/design/proofs/${proofId}/presign-upload`,
      { method: "POST", body: JSON.stringify({ contentType }) },
    );
  },

  /**
   * Sube el archivo directo a Spaces con la URL firmada (PUT). SIN header
   * Authorization: la presigned URL ES la autorización y un Bearer rompería
   * la firma SigV4. El Content-Type debe ser el mismo del presign (va firmado).
   */
  async upload(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) {
      throw new Error(`La subida del archivo falló (HTTP ${res.status}).`);
    }
  },

  addVersion(
    proofId: string,
    input: { fileKey: string; contentType: ProofContentType; note?: string },
  ): Promise<{ proofId: string; version: number }> {
    return apiFetch<{ proofId: string; version: number }>(
      `/design/proofs/${proofId}/versions`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  downloadUrl(proofId: string, version: number): Promise<ApiProofDownload> {
    return apiFetch<ApiProofDownload>(
      `/design/proofs/${proofId}/versions/${version}/download`,
    );
  },

  send(
    proofId: string,
    channel: ApiApprovalChannel,
  ): Promise<ApiSendProofResult> {
    return apiFetch<ApiSendProofResult>(`/design/proofs/${proofId}/send`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
  },

  approve(proofId: string, comment?: string): Promise<void> {
    return apiFetch<void>(`/design/proofs/${proofId}/approve`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  },

  requestChanges(proofId: string, comment?: string): Promise<void> {
    return apiFetch<void>(`/design/proofs/${proofId}/request-changes`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  },

  addComment(proofId: string, body: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/design/proofs/${proofId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

/** Endpoints PÚBLICOS de la página /approve/[token] — sin JWT (auth: false). */
export const publicApprovalApi = {
  get(token: string): Promise<ApiPublicApproval> {
    return apiFetch<ApiPublicApproval>(
      `/design/approvals/public/${encodeURIComponent(token)}`,
      {},
      { auth: false },
    );
  },

  decide(
    token: string,
    decision: "approve" | "request_changes",
    comment?: string,
  ): Promise<{ decision: string; proofStatus: ApiDesignProofStatus }> {
    return apiFetch(
      `/design/approvals/public/${encodeURIComponent(token)}/decision`,
      { method: "POST", body: JSON.stringify({ decision, comment }) },
      { auth: false },
    );
  },

  comment(token: string, body: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(
      `/design/approvals/public/${encodeURIComponent(token)}/comments`,
      { method: "POST", body: JSON.stringify({ body }) },
      { auth: false },
    );
  },
};
