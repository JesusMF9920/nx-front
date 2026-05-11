"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { Kv } from "@/components/kv";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { rolesApi } from "@/lib/api/roles";
import type { ApiRole, ApiUser } from "@/lib/api/types";
import { usersApi } from "@/lib/api/users";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

function rolesOfUser(user: ApiUser, rolesById: Map<string, ApiRole>): ApiRole[] {
  return user.roleIds
    .map((id) => rolesById.get(id))
    .filter((r): r is ApiRole => Boolean(r));
}

const PAGE_SIZE = 25;

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiUser | null>(null);
  const [resetTarget, setResetTarget] = useState<ApiUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiUser | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activateUser = async (u: ApiUser) => {
    setActionError(null);
    try {
      await usersApi.activate(u.id);
      await reload(page);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo activar al usuario.",
      );
    }
  };

  const buildRowMenu = (u: ApiUser): MenuItem[] => [
    {
      label: "Editar usuario",
      icon: I.edit,
      onClick: () => setEditTarget(u),
    },
    ...(u.isActive
      ? [
          {
            label: "Restablecer contraseña",
            icon: I.lock,
            onClick: () => setResetTarget(u),
          } as MenuItem,
          {
            label: "Desactivar",
            icon: I.x,
            kind: "danger" as const,
            onClick: () => setDeactivateTarget(u),
          },
        ]
      : [
          {
            label: "Activar",
            icon: I.check,
            onClick: () => activateUser(u),
          } as MenuItem,
        ]),
  ];

  const rolesById = useMemo(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list({
          skip: (targetPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        rolesApi.list(),
      ]);
      setUsers(usersRes.items);
      setTotal(usersRes.total);
      setRoles(rolesRes);
      if (!selectedId && usersRes.items.length > 0) {
        setSelectedId(usersRes.items[0].id);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los usuarios.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Recarga al montar y al cambiar de página.
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) => {
      const roleNames = rolesOfUser(u, rolesById)
        .map((r) => r.name.toLowerCase())
        .join(" ");
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleNames.includes(q)
      );
    });
  }, [users, rolesById, query]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  const usersPerRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      for (const rid of u.roleIds) {
        map.set(rid, (map.get(rid) ?? 0) + 1);
      }
    }
    return map;
  }, [users]);

  // Productivo: ocultar el rol "super-admin" del catálogo visible.
  const visibleRoles = roles.filter((r) => r.name !== "super-admin");

  return (
    <>
      <PageHeader
        title="Usuarios y permisos"
        sub={`${users.length} usuarios · ${visibleRoles.length} roles configurados`}
        actions={
          <>
            <button className="btn">{I.shield} Configurar roles</button>
            <button
              className="btn btn--accent"
              onClick={() => setShowNew(true)}
              disabled={visibleRoles.length === 0}
            >
              {I.plus} Crear usuario
            </button>
          </>
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

      <div className="grid mb-5" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {visibleRoles.slice(0, 4).map((r) => (
          <div key={r.id} className="card p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-accent">{I.shield}</span>
              <div className="font-medium">{r.name}</div>
              <div className="spacer" />
              <span className="tag">{usersPerRole.get(r.id) ?? 0} usuarios</span>
            </div>
            <div className="text-muted text-xs mt-1.5">
              {r.description ?? "Sin descripción"}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Todos los usuarios</div>
            <div className="spacer" />
            <div className="topbar__search m-0" style={{ width: 220 }}>
              {I.search}
              <input
                placeholder="Buscar usuario"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="card__body text-muted text-sm">Cargando…</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estatus</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const userRoles = rolesOfUser(u, rolesById);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      style={{
                        background: selectedId === u.id ? "var(--surface-2)" : "",
                      }}
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size={28} />
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-muted text-[11px]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {userRoles.length === 0 ? (
                          <span className="text-muted text-xs">Sin rol</span>
                        ) : (
                          userRoles.map((r) => (
                            <span key={r.id} className="tag mr-1">
                              {r.name}
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="pill pill--ok">Activo</span>
                        ) : (
                          <span className="pill pill--neutral">Inactivo</span>
                        )}
                      </td>
                      <td className="num text-muted">{formatDate(u.createdAt)}</td>
                      <td>
                        <MenuButton
                          trigger={I.more}
                          items={buildRowMenu(u)}
                        />
                      </td>
                    </tr>
                  );
                })}
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
                ? "Sin usuarios"
                : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE,
                    total,
                  )} de ${total}`}
            </span>
            {query.trim() && (
              <span className="text-muted-2">
                · La búsqueda filtra dentro de esta página
              </span>
            )}
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

        {selected ? (
          <div className="card self-start">
            <div className="card__body">
              <div className="flex items-center gap-3.5">
                <Avatar name={selected.name} size={48} />
                <div className="flex-1">
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="text-muted text-xs">{selected.email}</div>
                </div>
              </div>

              <div className="divider" />

              <div className="grid" style={{ gap: 10 }}>
                <Kv
                  k="Roles"
                  v={
                    rolesOfUser(selected, rolesById).length === 0 ? (
                      <span className="text-muted text-xs">Sin rol</span>
                    ) : (
                      rolesOfUser(selected, rolesById).map((r) => (
                        <span key={r.id} className="tag mr-1">
                          {r.name}
                        </span>
                      ))
                    )
                  }
                />
                <Kv
                  k="Estatus"
                  v={
                    selected.isActive ? (
                      <span className="pill pill--ok">Activo</span>
                    ) : (
                      <span className="pill pill--neutral">Inactivo</span>
                    )
                  }
                />
                <Kv k="Alta" v={formatDate(selected.createdAt)} mono />
                <Kv
                  k="Verificación"
                  v={
                    selected.emailVerifiedAt ? (
                      <span className="pill pill--ok">Verificado</span>
                    ) : (
                      <span className="pill pill--neutral">Pendiente</span>
                    )
                  }
                />
                <Kv
                  k="Cambio forzado"
                  v={
                    selected.mustChangePassword ? (
                      <span className="pill pill--warn">Pendiente</span>
                    ) : (
                      <span className="pill pill--neutral">No</span>
                    )
                  }
                />
              </div>

              <div className="divider" />

              <div className="flex gap-1.5 flex-wrap">
                <button
                  className="btn btn--sm"
                  onClick={() => setEditTarget(selected)}
                >
                  {I.edit} Editar usuario
                </button>
                {selected.isActive && (
                  <button
                    className="btn btn--sm"
                    onClick={() => setResetTarget(selected)}
                  >
                    {I.lock} Restablecer contraseña
                  </button>
                )}
                {selected.isActive ? (
                  <button
                    className="btn btn--sm btn--danger"
                    onClick={() => setDeactivateTarget(selected)}
                  >
                    {I.x} Desactivar
                  </button>
                ) : (
                  <button
                    className="btn btn--sm btn--accent"
                    onClick={() => activateUser(selected)}
                  >
                    {I.check} Activar
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card self-start">
            <div className="card__body text-muted text-sm">
              Selecciona un usuario para ver detalles.
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <NewUserModal
          roles={visibleRoles}
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            // Los nuevos usuarios aparecen al final (orden createdAt asc):
            // saltamos a la última página para que el admin lo vea.
            const fresh = await usersApi.list({ take: 1, skip: 0 });
            const lastPage = Math.max(
              1,
              Math.ceil(fresh.total / PAGE_SIZE),
            );
            if (lastPage !== page) {
              setPage(lastPage);
            } else {
              await reload(lastPage);
            }
          }}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            setEditTarget(null);
            await reload(page);
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={async () => {
            setResetTarget(null);
            await reload(page);
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desactivar usuario"
          kind="danger"
          confirmLabel="Desactivar"
          message={
            <>
              ¿Desactivar a{" "}
              <span className="font-medium text-ink-2">
                {deactivateTarget.name}
              </span>
              ? No podrá iniciar sesión hasta que lo reactives. Sus sesiones
              activas se cerrarán.
            </>
          }
          onClose={() => setDeactivateTarget(null)}
          onConfirm={async () => {
            try {
              await usersApi.deactivate(deactivateTarget.id);
              setDeactivateTarget(null);
              await reload(page);
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo desactivar al usuario.",
              );
            }
          }}
        />
      )}
    </>
  );
}

function NewUserModal({
  roles,
  onClose,
  onCreated,
}: {
  roles: ApiRole[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>(roles[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPwd) {
      setError("La contraseña y su confirmación no coinciden.");
      return;
    }
    if (!roleId) {
      setError("Selecciona un rol.");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await usersApi.create({
        email: email.trim(),
        name: name.trim(),
        password,
      });
      await rolesApi.assign(roleId, id);
      await onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ya existe un usuario con ese correo."
            : err.message
          : "No se pudo crear el usuario.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Crear nuevo usuario"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="new-user-form"
            disabled={submitting}
          >
            {submitting ? (
              "Creando…"
            ) : (
              <>
                {I.plus} Crear usuario
              </>
            )}
          </button>
        </>
      }
    >
      <form id="new-user-form" onSubmit={submit} className="grid" style={{ gap: 14 }}>
        <div className="field">
          <span className="label">Nombre completo</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <span className="label">Correo</span>
          <input
            className="input"
            type="email"
            placeholder="usuario@nexum.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <span className="label">Rol</span>
          <select
            className="select"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <span className="label">Contraseña temporal</span>
            <input
              className="input"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <span className="label">Confirmar</span>
            <input
              className="input"
              type="password"
              minLength={8}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
            />
          </div>
        </div>
        {/* TODO: el backend aún no tiene el concepto de "sucursal". */}
        <div className="help">
          Crea la cuenta con esta contraseña temporal y compártela en privado.
          El usuario tendrá que cambiarla en su primer ingreso.
        </div>
        {error && (
          <div
            className="rounded-md text-xs"
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

function ResetPasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: ApiUser;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPwd) {
      setError("La contraseña y su confirmación no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.resetPassword(user.id, password);
      await onDone();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo restablecer la contraseña.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Restablecer contraseña"
      onClose={onClose}
      width={460}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="reset-pwd-form"
            disabled={submitting}
          >
            {submitting ? (
              "Guardando…"
            ) : (
              <>
                {I.lock} Establecer nueva contraseña
              </>
            )}
          </button>
        </>
      }
    >
      <form id="reset-pwd-form" onSubmit={submit} className="grid" style={{ gap: 14 }}>
        <div className="text-sm text-muted">
          Vas a restablecer la contraseña de{" "}
          <span className="font-medium text-ink-2">{user.name}</span> ({user.email}).
          Se cerrarán sus sesiones activas y se le pedirá cambiarla en su próximo
          ingreso.
        </div>
        <div className="field">
          <span className="label">Nueva contraseña temporal</span>
          <input
            className="input"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <span className="label">Confirmar</span>
          <input
            className="input"
            type="password"
            minLength={8}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
          />
        </div>
        {error && (
          <div
            className="rounded-md text-xs"
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

function EditUserModal({
  user,
  onClose,
  onDone,
}: {
  user: ApiUser;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length === 0) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    const patch: { name?: string; email?: string } = {};
    if (trimmedName !== user.name) patch.name = trimmedName;
    if (trimmedEmail !== user.email) patch.email = trimmedEmail;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.update(user.id, patch);
      await onDone();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ya existe un usuario con ese correo."
            : err.message
          : "No se pudo guardar los cambios.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Editar usuario"
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="edit-user-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={submit} className="grid" style={{ gap: 14 }}>
        <div className="field">
          <span className="label">Nombre completo</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <span className="label">Correo</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {email !== user.email && (
            <small className="help mt-1">
              Cambiar el correo marca al usuario como no verificado.
            </small>
          )}
        </div>
        {error && (
          <div
            className="rounded-md text-xs"
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
