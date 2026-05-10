"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Kv } from "@/components/kv";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PermRow } from "@/components/perm-row";
import { NEXUM_USERS, ROLE_DEFINITIONS } from "@/lib/mock-users";
import type { Role, User } from "@/lib/types";

export default function UsersPage() {
  const [selected, setSelected] = useState<User>(NEXUM_USERS[0]);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");

  const filteredUsers = NEXUM_USERS.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const roleCount = (role: Role) => NEXUM_USERS.filter((u) => u.role === role).length;
  const permsFor = (role: Role): [string, boolean][] => [
    ["Ver POS", true],
    ["Cobrar y emitir tickets", true],
    ["Aplicar descuentos", role !== "Cajero"],
    ["Editar productos", role === "Administrador"],
    ["Editar clientes", role !== "Producción"],
    ["Aprobar diseños", role === "Administrador" || role === "Diseñadora"],
    ["Ver reportes", role === "Administrador"],
    ["Administrar usuarios", role === "Administrador"],
  ];

  return (
    <>
      <PageHeader
        title="Usuarios y permisos"
        sub={`${NEXUM_USERS.length} usuarios · ${ROLE_DEFINITIONS.length} roles configurados`}
        actions={
          <>
            <button className="btn">{I.shield} Configurar roles</button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Invitar usuario
            </button>
          </>
        }
      />

      <div className="grid mb-5" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {ROLE_DEFINITIONS.map((r) => (
          <div key={r.name} className="card p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-accent">{I.shield}</span>
              <div className="font-medium">{r.name}</div>
              <div className="spacer" />
              <span className="tag">{roleCount(r.name)} usuarios</span>
            </div>
            <div className="text-muted text-xs mt-1.5">{r.scope}</div>
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
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estatus</th>
                <th>Último acceso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  style={{ background: selected.id === u.id ? "var(--surface-2)" : "" }}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size={28} />
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-muted text-[11px]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{u.role}</span>
                  </td>
                  <td>
                    {u.status === "Activo" ? (
                      <span className="pill pill--ok">Activo</span>
                    ) : (
                      <span className="pill pill--neutral">Inactivo</span>
                    )}
                  </td>
                  <td className="num text-muted">{u.lastLogin}</td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Más acciones"
                    >
                      {I.more}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card self-start">
          <div className="card__body">
            <div className="flex items-center gap-3.5">
              <Avatar name={selected.name} size={48} />
              <div className="flex-1">
                <div className="text-lg font-semibold">{selected.name}</div>
                <div className="text-muted text-xs">{selected.email}</div>
              </div>
              <button className="icon-btn" aria-label="Más acciones">{I.more}</button>
            </div>

            <div className="divider" />

            <div className="grid" style={{ gap: 10 }}>
              <Kv k="Rol" v={<span className="tag">{selected.role}</span>} />
              <Kv
                k="Estatus"
                v={
                  selected.status === "Activo" ? (
                    <span className="pill pill--ok">Activo</span>
                  ) : (
                    <span className="pill pill--neutral">Inactivo</span>
                  )
                }
              />
              <Kv k="Último acceso" v={selected.lastLogin} mono />
              <Kv k="Sucursal" v="Imprenta Centro" />
              <Kv k="Autenticación 2FA" v={<span className="pill pill--ok">Habilitada</span>} />
            </div>

            <div className="divider" />

            <div className="font-medium mb-2">Permisos</div>
            <div className="grid grid-cols-2 gap-2">
              {permsFor(selected.role).map(([k, on]) => (
                <PermRow key={k} label={k} on={on} />
              ))}
            </div>

            <div className="divider" />

            <div className="flex gap-1.5">
              <button className="btn btn--sm">{I.edit} Editar usuario</button>
              <button className="btn btn--sm">{I.lock} Restablecer contraseña</button>
              <button className="btn btn--sm btn--danger">{I.x} Desactivar</button>
            </div>
          </div>
        </div>
      </div>

      {showNew && (
        <Modal
          title="Invitar nuevo usuario"
          onClose={() => setShowNew(false)}
          width={560}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="btn btn--accent" onClick={() => setShowNew(false)}>
                {I.send} Enviar invitación
              </button>
            </>
          }
        >
          <div className="grid" style={{ gap: 14 }}>
            <div className="field">
              <span className="label">Nombre completo</span>
              <input className="input" />
            </div>
            <div className="field">
              <span className="label">Correo</span>
              <input className="input" placeholder="usuario@nexum.mx" />
            </div>
            <div className="field">
              <span className="label">Rol</span>
              <select className="select">
                <option>Cajero</option>
                <option>Diseñadora</option>
                <option>Producción</option>
                <option>Administrador</option>
              </select>
            </div>
            <div className="field">
              <span className="label">Sucursal</span>
              <select className="select">
                <option>Imprenta Centro</option>
                <option>Sucursal Norte</option>
                <option>Sucursal Sur</option>
              </select>
            </div>
            <div className="help">
              Recibirá un correo con el link de acceso. Tendrá que crear su contraseña al primer ingreso.
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
