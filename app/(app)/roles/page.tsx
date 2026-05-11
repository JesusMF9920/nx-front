"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiRole | null>(null);
  const [query, setQuery] = useState("");
  const [assignTarget, setAssignTarget] = useState<ApiRole | null>(null);
  const [savingPermKey, setSavingPermKey] = useState<string | null>(null);

  const reload = async (preserveId?: string) => {
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
      const nextSelected =
        preserveId && visible.some((r) => r.id === preserveId)
          ? preserveId
          : selectedId && visible.some((r) => r.id === selectedId)
            ? selectedId
            : (visible[0]?.id ?? null);
      setSelectedId(nextSelected);
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

  const filteredRoles = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, query]);

  const buildRoleMenu = (r: ApiRole): MenuItem[] => [
    {
      label: "Editar",
      icon: I.edit,
      onClick: () => setEditTarget(r),
    },
    {
      label: "Asignar usuario",
      icon: I.plus,
      onClick: () => setAssignTarget(r),
    },
    {
      label: "Eliminar",
      icon: I.x,
      kind: "danger",
      onClick: () => setDeleteTarget(r),
    },
  ];

  const updateRoleLocal = (roleId: string, patch: Partial<ApiRole>) => {
    setRoles((rs) => rs.map((r) => (r.id === roleId ? { ...r, ...patch } : r)));
  };

  const togglePermission = async (
    role: ApiRole,
    permId: string,
    currentlyHas: boolean,
  ) => {
    if (savingPermKey) return;
    const key = `${role.id}|${permId}`;
    const next = currentlyHas
      ? role.permissions.filter((p) => p !== permId)
      : [...role.permissions, permId];
    const prev = role.permissions;
    setActionError(null);
    setSavingPermKey(key);
    updateRoleLocal(role.id, { permissions: next });
    try {
      await rolesApi.update(role.id, { permissions: next });
    } catch (err) {
      updateRoleLocal(role.id, { permissions: prev });
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el permiso.",
      );
    } finally {
      setSavingPermKey(null);
    }
  };

  const revokeUser = async (role: ApiRole, user: ApiUser) => {
    setActionError(null);
    try {
      await rolesApi.revoke(role.id, user.id);
      await reload(role.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo revocar el rol al usuario.",
      );
    }
  };

  const selectedUsers = selected
    ? users.filter((u) => u.roleIds.includes(selected.id))
    : [];

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

      {(loadError || actionError) && (
        <div
          className="card mb-5 flex items-start gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{loadError ?? actionError}</span>
          {actionError && !loadError && (
            <button
              className="icon-btn"
              onClick={() => setActionError(null)}
              aria-label="Cerrar mensaje"
              type="button"
            >
              {I.x}
            </button>
          )}
        </div>
      )}

      <div className="grid items-start gap-[18px]" style={{ gridTemplateColumns: "280px 1fr" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Roles</div>
            <div className="spacer" />
            <div className="topbar__search m-0" style={{ width: 140 }}>
              {I.search}
              <input
                placeholder="Buscar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="px-3.5 py-3 text-muted text-sm">Cargando…</div>
            ) : filteredRoles.length === 0 ? (
              <div className="px-3.5 py-3 text-muted text-sm">
                {query.trim()
                  ? "Sin coincidencias."
                  : "No hay roles. Crea uno con el botón de arriba."}
              </div>
            ) : (
              filteredRoles.map((r) => {
                const isSelected = selected?.id === r.id;
                const count = usersPerRole.get(r.id) ?? 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="flex items-start gap-2 px-3.5 py-3 cursor-pointer"
                    style={{
                      borderTop: "1px solid var(--line)",
                      background: isSelected ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full shrink-0"
                          style={{
                            width: 8,
                            height: 8,
                            background: "var(--accent)",
                          }}
                        />
                        <div className="font-medium text-[13px] truncate">
                          {r.name}
                        </div>
                      </div>
                      <div className="text-muted text-[11px] ml-4 mt-0.5">
                        {r.description ?? "Sin descripción"}
                      </div>
                      <div className="ml-4 mt-1 text-[11px] text-muted">
                        <span className="num">{count}</span>{" "}
                        {count === 1 ? "usuario" : "usuarios"}
                      </div>
                    </div>
                    <MenuButton trigger={I.more} items={buildRoleMenu(r)} />
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
                <button
                  className="btn btn--sm"
                  onClick={() => setEditTarget(selected)}
                >
                  {I.edit} Editar
                </button>
                <button
                  className="btn btn--sm btn--danger"
                  onClick={() => setDeleteTarget(selected)}
                >
                  {I.x} Eliminar
                </button>
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
                        const key = `${selected.id}|${p.id}`;
                        const saving = savingPermKey === key;
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] cursor-pointer"
                            style={{ opacity: saving ? 0.6 : 1 }}
                          >
                            <input
                              type="checkbox"
                              checked={has}
                              disabled={savingPermKey !== null}
                              onChange={() =>
                                togglePermission(selected, p.id, has)
                              }
                            />
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
                            {saving && (
                              <span className="text-[10px] text-muted-2 ml-1">
                                Guardando…
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="card__head" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="card__title">Usuarios con este rol</div>
                <div className="spacer" />
                <button
                  className="btn btn--sm btn--accent"
                  onClick={() => setAssignTarget(selected)}
                >
                  {I.plus} Asignar usuario
                </button>
              </div>
              {selectedUsers.length === 0 ? (
                <div className="card__body text-muted text-sm">
                  Nadie tiene este rol todavía.
                </div>
              ) : (
                <div>
                  {selectedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-[13px]"
                      style={{ borderTop: "1px solid var(--line)" }}
                    >
                      <Avatar name={u.name} size={28} />
                      <div className="flex-1">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-muted text-[11px]">{u.email}</div>
                      </div>
                      {!u.isActive && (
                        <span className="pill pill--neutral">Inactivo</span>
                      )}
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={() => revokeUser(selected, u)}
                      >
                        Revocar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {users.length >= 100 && (
                <div
                  className="px-3.5 py-2 text-[11px] text-muted-2"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  Mostrando los primeros 100 usuarios. Si hay más, la asignación
                  por rol no los considera.
                </div>
              )}
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
            await reload(id);
          }}
        />
      )}

      {editTarget && (
        <EditRoleModal
          role={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            const id = editTarget.id;
            setEditTarget(null);
            await reload(id);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar rol"
          kind="danger"
          confirmLabel="Eliminar"
          message={
            <>
              ¿Eliminar el rol{" "}
              <span className="font-medium text-ink-2">
                {deleteTarget.name}
              </span>
              ?{" "}
              {(usersPerRole.get(deleteTarget.id) ?? 0) > 0 ? (
                <>
                  Tiene{" "}
                  <span className="font-medium text-ink-2">
                    {usersPerRole.get(deleteTarget.id)}{" "}
                    {usersPerRole.get(deleteTarget.id) === 1
                      ? "usuario asignado"
                      : "usuarios asignados"}
                  </span>{" "}
                  que se quedarán sin este rol. Esta acción no se puede
                  deshacer.
                </>
              ) : (
                "Esta acción no se puede deshacer."
              )}
            </>
          }
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await rolesApi.remove(deleteTarget.id);
              setDeleteTarget(null);
              setSelectedId(null);
              await reload();
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo eliminar el rol.",
              );
            }
          }}
        />
      )}

      {assignTarget && (
        <AssignUserModal
          role={assignTarget}
          candidates={users.filter(
            (u) => u.isActive && !u.roleIds.includes(assignTarget.id),
          )}
          onClose={() => setAssignTarget(null)}
          onDone={async () => {
            const id = assignTarget.id;
            setAssignTarget(null);
            await reload(id);
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
            maxLength={60}
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Descripción</span>
          <input
            className="input"
            placeholder="¿Qué hace este rol?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
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

function EditRoleModal({
  role,
  onClose,
  onDone,
}: {
  role: ApiRole;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    const trimmedDesc = description.trim();
    const nextDesc = trimmedDesc.length === 0 ? null : trimmedDesc;
    const patch: { name?: string; description?: string | null } = {};
    if (trimmedName !== role.name) patch.name = trimmedName;
    if (nextDesc !== role.description) patch.description = nextDesc;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await rolesApi.update(role.id, patch);
      await onDone();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudieron guardar los cambios.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Editar rol"
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="edit-role-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="edit-role-form" onSubmit={submit}>
        <label className="field">
          <span className="label">Nombre del rol</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoFocus
          />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Descripción</span>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
          />
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

function AssignUserModal({
  role,
  candidates,
  onClose,
  onDone,
}: {
  role: ApiRole;
  candidates: ApiUser[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [userId, setUserId] = useState<string>(candidates[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !userId) return;
    setError(null);
    setSubmitting(true);
    try {
      await rolesApi.assign(role.id, userId);
      await onDone();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo asignar el rol al usuario.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Asignar usuario a ${role.name}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="assign-user-form"
            disabled={submitting || candidates.length === 0}
          >
            {submitting ? "Asignando…" : "Asignar"}
          </button>
        </>
      }
    >
      <form id="assign-user-form" onSubmit={submit}>
        {candidates.length === 0 ? (
          <div className="text-sm text-muted">
            No hay usuarios activos disponibles para asignar a este rol.
          </div>
        ) : (
          <label className="field">
            <span className="label">Usuario</span>
            <select
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>
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
      </form>
    </Modal>
  );
}
