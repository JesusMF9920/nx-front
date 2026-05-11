"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { rolesApi } from "@/lib/api/roles";
import { usersApi } from "@/lib/api/users";
import type { ApiRole, ApiUser } from "@/lib/api/types";
import {
  PERMISSION_GROUPS,
  TOTAL_PERMISSIONS,
} from "@/lib/permissions-catalog";

const SYSTEM_ROLE_NAMES = new Set(["super-admin"]);

export default function RolesPage() {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const reload = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        rolesApi.list(),
        usersApi.list({ take: 100 }),
      ]);
      const visible = rolesRes.filter((r) => !SYSTEM_ROLE_NAMES.has(r.name));
      setRoles(visible);
      setUsers(usersRes.items);
      if (!selectedId && visible.length > 0) {
        setSelectedId(visible[0].id);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los roles.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usersPerRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      for (const rid of u.roleIds) {
        map.set(rid, (map.get(rid) ?? 0) + 1);
      }
    }
    return map;
  }, [users]);

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? null,
    [roles, selectedId],
  );

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        sub={`${roles.length} roles · ${TOTAL_PERMISSIONS} permisos disponibles`}
        actions={
          <button className="btn btn--accent" onClick={() => setShowNew(true)}>
            {I.plus} Nuevo rol
          </button>
        }
      />

      {loadError && (
        <div
          className="card mb-5"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {loadError}
        </div>
      )}

      <div className="grid items-start gap-[18px]" style={{ gridTemplateColumns: "280px 1fr" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Roles</div>
          </div>
          <div>
            {loading ? (
              <div className="px-3.5 py-3 text-muted text-sm">Cargando…</div>
            ) : (
              roles.map((r) => {
                const isSelected = selected?.id === r.id;
                const count = usersPerRole.get(r.id) ?? 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="px-3.5 py-3 cursor-pointer"
                    style={{
                      borderTop: "1px solid var(--line)",
                      background: isSelected ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 8,
                          height: 8,
                          background: "var(--accent)",
                        }}
                      />
                      <div className="font-medium text-[13px]">{r.name}</div>
                    </div>
                    <div className="text-muted text-[11px] ml-4 mt-0.5">
                      {r.description ?? "Sin descripción"}
                    </div>
                    <div className="ml-4 mt-1 text-[11px] text-muted">
                      <span className="num">{count}</span>{" "}
                      {count === 1 ? "usuario" : "usuarios"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          {selected ? (
            <>
              <div className="card__head">
                <div>
                  <div className="card__title">{selected.name}</div>
                  <div className="text-muted text-xs">
                    {selected.description ?? "Sin descripción"}
                  </div>
                </div>
                <div className="spacer" />
                <Link className="btn btn--sm btn--ghost" href="/users">
                  Ver {usersPerRole.get(selected.id) ?? 0}{" "}
                  {(usersPerRole.get(selected.id) ?? 0) === 1
                    ? "usuario"
                    : "usuarios"}
                </Link>
              </div>

              <div className="p-2">
                {PERMISSION_GROUPS.map((grp) => {
                  const granted = grp.items.filter((p) =>
                    selected.permissions.includes(p.id),
                  ).length;
                  return (
                    <div
                      key={grp.group}
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <div className="px-3.5 py-2.5 flex items-center gap-2 bg-surface-2">
                        <div
                          className="text-[11px] uppercase text-muted font-medium"
                          style={{ letterSpacing: ".06em" }}
                        >
                          {grp.group}
                        </div>
                        <div className="spacer" />
                        <span className="tag text-[10px]">
                          {granted}/{grp.items.length}
                        </span>
                      </div>
                      {grp.items.map((p) => {
                        const has = selected.permissions.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-[13px]"
                          >
                            <input type="checkbox" checked={has} readOnly />
                            <span
                              className="flex-1"
                              style={{
                                color: has ? "var(--ink)" : "var(--muted)",
                              }}
                            >
                              {p.label}
                            </span>
                            <span className="font-mono text-[10px] text-muted-2">
                              {p.id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="card__body text-muted text-sm">
              {loading ? "Cargando…" : "No hay roles disponibles."}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewRoleModal
          existing={roles}
          onClose={() => setShowNew(false)}
          onCreated={async (id) => {
            setShowNew(false);
            await reload();
            setSelectedId(id);
          }}
        />
      )}
    </>
  );
}

function NewRoleModal({
  existing,
  onClose,
  onCreated,
}: {
  existing: ApiRole[];
  onClose: () => void;
  onCreated: (createdId: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (name.trim().length === 0) {
      setError("Ponle un nombre al rol.");
      return;
    }
    setSubmitting(true);
    try {
      const template = existing.find((r) => r.id === templateId);
      const permissions = template ? [...template.permissions] : [];
      const created = await rolesApi.create({
        name: name.trim(),
        description: description.trim() || null,
        permissions,
      });
      await onCreated(created.id);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo crear el rol.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Nuevo rol"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="new-role-form"
            disabled={submitting}
          >
            {submitting ? (
              "Creando…"
            ) : (
              <>
                {I.check} Crear
              </>
            )}
          </button>
        </>
      }
    >
      <form id="new-role-form" onSubmit={submit}>
        <label className="field">
          <span className="label">Nombre del rol</span>
          <input
            className="input"
            placeholder="Ej. Supervisor de turno"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Descripción</span>
          <input
            className="input"
            placeholder="¿Qué hace este rol?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Plantilla inicial</span>
          <select
            className="input"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">En blanco</option>
            {existing.map((r) => (
              <option key={r.id} value={r.id}>
                Copiar permisos de: {r.name}
              </option>
            ))}
          </select>
        </label>
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
      </form>
    </Modal>
  );
}
