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

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18, alignItems: "start" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Roles</div>
          </div>
          <div>
            {NEXUM_ROLE_DEFINITIONS.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid var(--line)",
                  cursor: "pointer",
                  background: selected.id === r.id ? "var(--accent-soft)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: r.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                  {r.system && (
                    <span className="tag" style={{ fontSize: 9 }}>
                      {I.lock} sistema
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 11, marginLeft: 16, marginTop: 2 }}>
                  {r.desc}
                </div>
                <div
                  style={{
                    marginLeft: 16,
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
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
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{selected.desc}</div>
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
              style={{
                padding: 16,
                background: "var(--accent-soft)",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--accent-ink)",
              }}
            >
              <span>{I.shield}</span>
              <span>Este rol tiene acceso total. Los permisos individuales no aplican.</span>
            </div>
          )}

          <div style={{ padding: 8 }}>
            {NEXUM_PERMISSIONS.map((grp) => {
              const granted = isAdmin
                ? grp.items.length
                : grp.items.filter((i) => selected.perms[i.id]).length;
              return (
                <div key={grp.group} style={{ borderBottom: "1px solid var(--line)" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: "var(--muted)",
                        fontWeight: 500,
                      }}
                    >
                      {grp.group}
                    </div>
                    <div className="spacer" />
                    <span className="tag" style={{ fontSize: 10 }}>
                      {granted}/{grp.items.length}
                    </span>
                  </div>
                  {grp.items.map((p) => {
                    const has = isAdmin || !!selected.perms[p.id];
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 14px",
                          fontSize: 13,
                        }}
                      >
                        <input type="checkbox" checked={has} disabled={selected.system} readOnly />
                        <span style={{ flex: 1, color: has ? "var(--ink)" : "var(--muted)" }}>
                          {p.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            color: "var(--muted-2)",
                          }}
                        >
                          {p.id}
                        </span>
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
