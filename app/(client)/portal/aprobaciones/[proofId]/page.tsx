"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clientApprovalsApi } from "@/lib/api/client-portal/approvals";
import type { ClientApprovalDetail } from "@/lib/api/client-portal/types";
import { useClientAuth } from "@/lib/auth/client-auth-context";
import { fmtDate } from "@/lib/format";

export default function PortalAprobacionDetailPage() {
  const router = useRouter();
  const { proofId } = useParams<{ proofId: string }>();
  const { status } = useClientAuth();

  const [proof, setProof] = useState<ClientApprovalDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/entrar");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      setProof(await clientApprovalsApi.get(proofId));
    } catch {
      setNotFound(true);
    }
  }, [proofId]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void (async () => {
      await load();
    })();
  }, [status, load]);

  const decide = useCallback(
    async (decision: "approve" | "request_changes") => {
      setBusy(true);
      setActionError(null);
      try {
        await clientApprovalsApi.decide(
          proofId,
          decision,
          decision === "request_changes" ? comment.trim() : undefined,
        );
        await load();
        setChangesOpen(false);
        setComment("");
      } catch {
        setActionError(
          "No se pudo registrar tu respuesta. Intenta de nuevo.",
        );
      } finally {
        setBusy(false);
      }
    },
    [proofId, comment, load],
  );

  if (status !== "authenticated") return <Centered>Cargando…</Centered>;

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <p className="mt-6 text-sm opacity-70">No encontramos ese diseño.</p>
      </main>
    );
  }

  if (!proof) return <Centered>Cargando…</Centered>;

  const isImage = proof.contentType.startsWith("image/");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />
      <header className="mt-4 mb-4">
        <h1 className="text-xl font-semibold">{proof.productName}</h1>
        <p className="text-sm opacity-70">
          {proof.folio} · versión {proof.version}
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proof.previewUrl}
            alt={`Diseño ${proof.folio}`}
            className="max-h-[60vh] w-full object-contain bg-black/5"
          />
        ) : (
          <a
            href={proof.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block p-6 text-center text-sm text-[var(--accent,#1f6feb)] underline"
          >
            Abrir archivo del diseño
          </a>
        )}
      </div>

      {proof.versionNote && (
        <p className="mt-3 text-sm opacity-80">{proof.versionNote}</p>
      )}

      {proof.status === "approved" ? (
        <p className="mt-6 rounded-lg border border-[var(--border)] p-3 text-sm">
          ✅ Aprobaste este diseño
          {proof.decidedAt ? ` el ${fmtDate(proof.decidedAt)}` : ""}.
        </p>
      ) : proof.canDecide ? (
        <section className="mt-6 space-y-3">
          {actionError && (
            <p className="text-sm text-[var(--danger,#c0392b)]">{actionError}</p>
          )}
          {!changesOpen ? (
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => void decide("approve")}
                className="flex-1 rounded-lg bg-[var(--accent,#1f6feb)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Aprobar diseño
              </button>
              <button
                disabled={busy}
                onClick={() => setChangesOpen(true)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
              >
                Solicitar cambios
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe los cambios que necesitas…"
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <div className="flex gap-3">
                <button
                  disabled={busy || comment.trim().length === 0}
                  onClick={() => void decide("request_changes")}
                  className="flex-1 rounded-lg bg-[var(--accent,#1f6feb)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Enviar solicitud
                </button>
                <button
                  disabled={busy}
                  onClick={() => setChangesOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <p className="mt-6 text-sm opacity-70">
          Ya registramos tu solicitud de cambios. Te avisaremos cuando haya una
          nueva versión.
        </p>
      )}

      {proof.comments.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium opacity-80">Conversación</h2>
          <ul className="space-y-2">
            {proof.comments.map((c, i) => (
              <li
                key={i}
                className="rounded-lg border border-[var(--border)] p-3 text-sm"
              >
                <div className="mb-1 flex justify-between text-xs opacity-60">
                  <span>{c.authorName}</span>
                  <span>{fmtDate(c.createdAt)}</span>
                </div>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/portal/aprobaciones"
      className="text-sm opacity-70 hover:underline"
    >
      ← Aprobaciones
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-sm opacity-70">
      {children}
    </main>
  );
}
