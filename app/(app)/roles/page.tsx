"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { SkeletonText } from "@/components/skeleton";
import { usePermission } from "@/lib/auth/auth-context";
import { useToast } from "@/lib/toast/toast-context";
import { ApiError } from "@/lib/api/errors";
import { auditApi, type ApiAuditEntry } from "@/lib/api/audit";
import {
  permissionsApi,
  type ApiPermission,
} from "@/lib/api/permissions";
import { rolesApi } from "@/lib/api/roles";
import { usersApi } from "@/lib/api/users";
import type { ApiRole, ApiUser } from "@/lib/api/types";

const SYSTEM_ROLE_NAMES = new Set(["super-admin"]);
const USERS_PAGE_SIZE = 100;

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

function actionLabel(action: string): string {
  switch (action) {
    case "iam.role.created":
      return "Creado";
    case "iam.role.updated":
      return "Modificado";
    case "iam.role.deleted":
      return "Eliminado";
    default:
      return action;
  }
}

export default function RolesPage() {
  const toast = useToast();
  const canWrite = usePermission("iam.roles.write");
  const canAssign = usePermission("iam.roles.assign");
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiRole | null>(null);
  const [assignTarget, setAssignTarget] = useState<ApiRole | null>(null);
  const [savingPermKey, setSavingPermKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Detalles del rol seleccionado (carga independiente al seleccionar).
  const [roleUsers, setRoleUsers] = useState<ApiUser[]>([]);
  const [roleUsersTotal, setRoleUsersTotal] = useState(0);
  const [latestAudit, setLatestAudit] = useState<ApiAuditEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const reload = async (preserveId?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [rolesRes, usersRes, catalogRes] = await Promise.all([
        rolesApi.list(),
        usersApi.list({ take: USERS_PAGE_SIZE }),
        permissions.length === 0
          ? permissionsApi.catalog()
          : Promise.resolve({ items: permissions }),
      ]);
      const visible = rolesRes.filter((r) => !SYSTEM_ROLE_NAMES.has(r.name));
      setRoles(visible);
      setAllUsers(usersRes.items);
      setAllUsersTotal(usersRes.total);
      setPermissions(catalogRes.items);
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

  // Detalle del rol seleccionado: users-by-role + last audit.
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleUsers([]);
      setRoleUsersTotal(0);
      setLatestAudit(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      try {
        const [usersRes, auditRes] = await Promise.all([
          usersApi.list({ roleId: selectedId, take: USERS_PAGE_SIZE }),
          auditApi.list({ target: `role:${selectedId}`, take: 1 }),
        ]);
        if (cancelled) return;
        setRoleUsers(usersRes.items);
        setRoleUsersTotal(usersRes.total);
        setLatestAudit(auditRes.items[0] ?? null);
      } catch (err) {
        if (cancelled) return;
        setActionError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el detalle del rol.",
        );
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const permissionGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ApiPermission[]>();
    for (const p of permissions) {
      if (!map.has(p.group)) {
        map.set(p.group, []);
        order.push(p.group);
      }
      map.get(p.group)!.push(p);
    }
    return order.map((g) => ({ group: g, items: map.get(g) ?? [] }));
  }, [permissions]);

  const usersPerRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of allUsers) {
      for (const rid of u.roleIds) {
        map.set(rid, (map.get(rid) ?? 0) + 1);
      }
    }
    return map;
  }, [allUsers]);

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

  const actorById = useMemo(() => {
    const m = new Map<string, ApiUser>();
    for (const u of allUsers) m.set(u.id, u);
    return m;
  }, [allUsers]);

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
      toast.success(currentlyHas ? "Permiso retirado" : "Permiso otorgado");
      // Refrescar última modificación.
      const auditRes = await auditApi.list({
        target: `role:${role.id}`,
        take: 1,
      });
      setLatestAudit(auditRes.items[0] ?? null);
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
      toast.success("Rol revocado al usuario");
      // Recarga del detalle + del rail (counts).
      const [detail, allUsersRes] = await Promise.all([
        usersApi.list({ roleId: role.id, take: USERS_PAGE_SIZE }),
        usersApi.list({ take: USERS_PAGE_SIZE }),
      ]);
      setRoleUsers(detail.items);
      setRoleUsersTotal(detail.total);
      setAllUsers(allUsersRes.items);
      setAllUsersTotal(allUsersRes.total);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo revocar el rol al usuario.",
      );
    }
  };

  const buildRoleMenu = (r: ApiRole): MenuItem[] => {
    const items: MenuItem[] = [];
    if (canWrite) {
      items.push({ label: "Editar", icon: I.edit, onClick: () => setEditTarget(r) });
    }
    if (canAssign) {
      items.push({
        label: "Asignar usuario",
        icon: I.plus,
        onClick: () => setAssignTarget(r),
      });
    }
    if (canWrite) {
      items.push({
        label: "Eliminar",
        icon: I.x,
        kind: "danger",
        onClick: () => setDeleteTarget(r),
      });
    }
    return items;
  };

  const renderAuditLine = (entry: ApiAuditEntry) => {
    const actor = entry.actorId ? actorById.get(entry.actorId) : null;
    const actorLabel = actor
      ? actor.name
      : entry.actorId
        ? `usuario ${entry.actorId.slice(0, 8)}…`
        : "sistema";
    return (
      <>
        {actionLabel(entry.action)} por{" "}
        <span className="font-medium text-ink-2">{actorLabel}</span> ·{" "}
        {formatDateTime(entry.createdAt)}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        sub={`${roles.length} roles · ${permissions.length} permisos disponibles`}
        actions={
          canWrite && (
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Nuevo rol
            </button>
          )
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] items-start gap-[18px]">
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
              <div className="px-3.5 py-3">
                <SkeletonText lines={5} />
              </div>
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
                    {(canWrite || canAssign) && (
                      <MenuButton trigger={I.more} items={buildRoleMenu(r)} />
                    )}
                  </div>
                );
              })
            )}
          </div>
          {allUsersTotal > USERS_PAGE_SIZE && (
            <div
              className="px-3.5 py-2 text-[11px] text-muted-2"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              Conteo basado en los primeros {USERS_PAGE_SIZE} de {allUsersTotal}{" "}
              usuarios.
            </div>
          )}
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
                  {latestAudit && (
                    <div className="text-muted text-[11px] mt-1">
                      {renderAuditLine(latestAudit)}
                    </div>
                  )}
                </div>
                <div className="spacer" />
                {canWrite && (
                  <>
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
                  </>
                )}
              </div>

              <div className="p-2">
                {permissionGroups.length === 0 ? (
                  <div className="px-3.5 py-3 text-muted text-sm">
                    No hay permisos en el catálogo.
                  </div>
                ) : (
                  permissionGroups.map((grp) => {
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
                  })
                )}
              </div>

              <div className="card__head" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="card__title">
                  Usuarios con este rol{" "}
                  <span className="text-muted text-xs font-normal">
                    ({roleUsersTotal})
                  </span>
                </div>
                <div className="spacer" />
                {canAssign && (
                  <button
                    className="btn btn--sm btn--accent"
                    onClick={() => setAssignTarget(selected)}
                  >
                    {I.plus} Asignar usuario
                  </button>
                )}
              </div>
              {detailLoading ? (
                <div className="card__body">
                  <SkeletonText lines={4} />
                </div>
              ) : roleUsers.length === 0 ? (
                <div className="card__body text-muted text-sm">
                  Nadie tiene este rol todavía.
                </div>
              ) : (
                <div>
                  {roleUsers.map((u) => (
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
                      {canAssign && (
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => revokeUser(selected, u)}
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {roleUsersTotal > USERS_PAGE_SIZE && (
                <div
                  className="px-3.5 py-2 text-[11px] text-muted-2"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  Mostrando los primeros {USERS_PAGE_SIZE} de {roleUsersTotal}.
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
              toast.success("Rol eliminado");
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
  const toast = useToast();
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
      toast.success("Rol creado");
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
  const toast = useToast();
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
      toast.success("Rol actualizado");
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
  onClose,
  onDone,
}: {
  role: ApiRole;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await usersApi.list({ take: 100 });
        if (cancelled) return;
        const eligible = res.items.filter(
          (u) => u.isActive && !u.roleIds.includes(role.id),
        );
        setCandidates(eligible);
        setUserId(eligible[0]?.id ?? "");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los usuarios.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [role.id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !userId) return;
    setError(null);
    setSubmitting(true);
    try {
      await rolesApi.assign(role.id, userId);
      toast.success("Usuario asignado al rol");
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
            disabled={submitting || candidates.length === 0 || loading}
          >
            {submitting ? "Asignando…" : "Asignar"}
          </button>
        </>
      }
    >
      <form id="assign-user-form" onSubmit={submit}>
        {loading ? (
          <div className="text-sm text-muted">Cargando usuarios…</div>
        ) : candidates.length === 0 ? (
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
