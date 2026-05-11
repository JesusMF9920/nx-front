"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { auditApi, type ApiAuditEntry } from "@/lib/api/audit";
import { ApiError } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

const PAGE_SIZE = 25;

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

const KNOWN_ACTIONS = [
  "iam.user.created",
  "iam.user.updated",
  "iam.user.deactivated",
  "iam.user.reactivated",
  "iam.user.password_changed",
  "iam.user.password_reset_by_admin",
  "iam.user.email_verified",
  "iam.user.logged_in",
  "iam.user.logged_out",
  "iam.role.created",
  "iam.role.updated",
  "iam.role.deleted",
  "iam.role.assigned",
  "iam.role.revoked",
];

export default function AuditPage() {
  const { permissions } = useAuth();
  const hasAccess = permissions.includes("audit.read");

  const [entries, setEntries] = useState<ApiAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await usersApi.list({ take: 100 });
        if (!cancelled) setUsers(res.items);
      } catch {
        // No-op: el detalle de actor cae a UUID si esto falla.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await auditApi.list({
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          action: actionFilter || undefined,
          target: targetFilter || undefined,
        });
        if (cancelled) return;
        setEntries(res.items);
        setTotal(res.total);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar la bitácora.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, page, actionFilter, targetFilter]);

  const actorById = useMemo(() => {
    const m = new Map<string, ApiUser>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const actorLabel = (entry: ApiAuditEntry): string => {
    if (!entry.actorId) return "Sistema";
    const u = actorById.get(entry.actorId);
    return u ? u.name : `${entry.actorId.slice(0, 8)}…`;
  };

  const applyTargetFilter = () => {
    setPage(1);
    setTargetFilter(targetQuery.trim());
  };

  if (!hasAccess) {
    return (
      <>
        <PageHeader title="Bitácora" sub="Auditoría del sistema" />
        <div
          className="card"
          style={{ padding: 16 }}
        >
          <div className="text-muted text-sm">
            No tienes permiso para ver la bitácora ({" "}
            <span className="font-mono text-[11px]">audit.read</span> ). Pídele a
            un administrador que te lo asigne.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bitácora"
        sub={`${total} eventos · auditoría del sistema`}
        actions={null}
      />

      <div className="card mb-3" style={{ padding: 12 }}>
        <div className="grid items-end gap-3" style={{ gridTemplateColumns: "240px 1fr auto" }}>
          <div className="field m-0">
            <span className="label">Acción</span>
            <select
              className="input"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {KNOWN_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="field m-0">
            <span className="label">Target (ej. user:UUID o role:UUID)</span>
            <input
              className="input"
              placeholder="role:..."
              value={targetQuery}
              onChange={(e) => setTargetQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyTargetFilter();
                }
              }}
            />
          </div>
          <div className="flex gap-1.5">
            <button
              className="btn"
              type="button"
              onClick={applyTargetFilter}
              disabled={targetQuery.trim() === targetFilter}
            >
              {I.search} Filtrar
            </button>
            {(actionFilter || targetFilter) && (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  setActionFilter("");
                  setTargetFilter("");
                  setTargetQuery("");
                  setPage(1);
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="card mb-3"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="card__body text-muted text-sm">Cargando…</div>
        ) : entries.length === 0 ? (
          <div className="card__body text-muted text-sm">
            No hay eventos que coincidan con los filtros.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Target</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="num text-muted">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td>{actorLabel(entry)}</td>
                  <td>
                    <span className="font-mono text-[11px]">{entry.action}</span>
                  </td>
                  <td>
                    {entry.target ? (
                      <span className="font-mono text-[11px] text-muted">
                        {entry.target}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {entry.metadata ? (
                      <code
                        className="font-mono text-[11px] text-muted"
                        style={{
                          display: "inline-block",
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                        title={JSON.stringify(entry.metadata)}
                      >
                        {JSON.stringify(entry.metadata)}
                      </code>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div
          className="flex items-center gap-3 text-xs text-muted"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <span>
            {total === 0
              ? "Sin eventos"
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} de ${total}`}
          </span>
          <div className="spacer" />
          <span className="num">
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            aria-label="Página anterior"
          >
            {I.chevronLeft}
          </button>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            aria-label="Página siguiente"
          >
            {I.chevronRight}
          </button>
        </div>
      </div>
    </>
  );
}
