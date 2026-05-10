"use client";

import Link from "next/link";
import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { NEXUM_PERMISSIONS } from "@/lib/mock-permissions";
import { NEXUM_ROLE_DEFINITIONS } from "@/lib/mock-roles";
import type { RoleDefinition } from "@/lib/types";

const TOTAL_PERMISSIONS = NEXUM_PERMISSIONS.reduce((s, g) => s + g.items.length, 0);

export default function RolesPage() {
  const [selectedId, setSelectedId] = useState<string>(NEXUM_ROLE_DEFINITIONS[1].id);
  const [showNew, setShowNew] = useState(false);

  const selected: RoleDefinition =
    NEXUM_ROLE_DEFINITIONS.find((r) => r.id === selectedId) ?? NEXUM_ROLE_DEFINITIONS[1];

  const isAdmin = selected.perms.all === true;

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        sub={`${NEXUM_ROLE_DEFINITIONS.length} roles · ${TOTAL_PERMISSIONS} permisos disponibles`}
        actions={
          <>
            <button className="btn">{I.copy} Duplicar rol</button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Nuevo rol
            </button>
          </>
        }
      />

      <div className="grid items-start gap-[18px]" style={{ gridTemplateColumns: "280px 1fr" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Roles</div>
          </div>
          <div>
            {NEXUM_ROLE_DEFINITIONS.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="px-3.5 py-3 cursor-pointer"
                style={{
                  borderTop: "1px solid var(--line)",
                  background: selected.id === r.id ? "var(--accent-soft)" : "transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full shrink-0"
                    style={{ width: 8, height: 8, background: r.color }}
                  />
                  <div className="font-medium text-[13px]">{r.name}</div>
                  {r.system && (
                    <span className="tag text-[9px]">
                      {I.lock} sistema
                    </span>
                  )}
                </div>
                <div className="text-muted text-[11px] ml-4 mt-0.5">{r.desc}</div>
                <div className="ml-4 mt-1 text-[11px] text-muted">
                  <span className="num">{r.users}</span> {r.users === 1 ? "usuario" : "usuarios"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">{selected.name}</div>
              <div className="text-muted text-xs">{selected.desc}</div>
            </div>
            <div className="spacer" />
            {!selected.system && (
              <button className="btn btn--sm btn--ghost">
                {I.edit} Editar
              </button>
            )}
            <Link className="btn btn--sm btn--ghost" href="/users">
              Ver {selected.users} {selected.users === 1 ? "usuario" : "usuarios"}
            </Link>
          </div>

          {isAdmin && (
            <div
              className="p-4 text-[13px] flex items-center gap-2 text-accent-ink bg-accent-soft"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <span>{I.shield}</span>
              <span>Este rol tiene acceso total. Los permisos individuales no aplican.</span>
            </div>
          )}

          <div className="p-2">
            {NEXUM_PERMISSIONS.map((grp) => {
              const granted = isAdmin
                ? grp.items.length
                : grp.items.filter((i) => selected.perms[i.id]).length;
              return (
                <div key={grp.group} style={{ borderBottom: "1px solid var(--line)" }}>
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
                    const has = isAdmin || !!selected.perms[p.id];
                    return (
                      <div key={p.id} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px]">
                        <input type="checkbox" checked={has} disabled={selected.system} readOnly />
                        <span
                          className="flex-1"
                          style={{ color: has ? "var(--ink)" : "var(--muted)" }}
                        >
                          {p.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-2">{p.id}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showNew && (
        <Modal
          title="Nuevo rol"
          onClose={() => setShowNew(false)}
          width={520}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="btn btn--accent" onClick={() => setShowNew(false)}>
                {I.check} Crear
              </button>
            </>
          }
        >
          <label className="field">
            <span className="label">Nombre del rol</span>
            <input className="input" placeholder="Ej. Supervisor de turno" />
          </label>
          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">Descripción</span>
            <input className="input" placeholder="¿Qué hace este rol?" />
          </label>
          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">Plantilla inicial</span>
            <select className="input">
              {NEXUM_ROLE_DEFINITIONS.map((r) => (
                <option key={r.id}>Empezar desde: {r.name}</option>
              ))}
              <option>En blanco</option>
            </select>
          </label>
        </Modal>
      )}
    </>
  );
}
