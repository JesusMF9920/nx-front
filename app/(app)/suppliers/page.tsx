"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { suppliersApi } from "@/lib/api/suppliers";
import type { ApiSupplier } from "@/lib/api/types";

type OrderByKey = "name" | "leadDays" | "reliability" | "createdAt";

const PAGE_SIZE = 25;

const ORDER_OPTIONS: { key: OrderByKey; label: string; dir: "asc" | "desc" }[] = [
  { key: "createdAt", label: "Más recientes", dir: "desc" },
  { key: "name", label: "Nombre (A-Z)", dir: "asc" },
  { key: "leadDays", label: "Lead time (menor primero)", dir: "asc" },
  { key: "reliability", label: "Confiabilidad (mayor primero)", dir: "desc" },
];

function reliabilityColor(r: number): string {
  if (r >= 90) return "var(--ok)";
  if (r >= 70) return "var(--warn)";
  return "var(--danger)";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [orderBy, setOrderBy] = useState<OrderByKey>("createdAt");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiSupplier | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiSupplier | null>(
    null,
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const changeOrderBy = (o: OrderByKey) => {
    setOrderBy(o);
    setPage(1);
  };
  const toggleInactive = () => {
    setShowInactive((v) => !v);
    setPage(1);
  };

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const dir =
        ORDER_OPTIONS.find((o) => o.key === orderBy)?.dir ?? "desc";
      const res = await suppliersApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        isActive: showInactive ? undefined : true,
        orderBy,
        order: dir,
      });
      setSuppliers(res.items);
      setTotal(res.total);
      if (!selectedId && res.items.length > 0) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los proveedores.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, orderBy, showInactive]);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await suppliersApi.get(selectedId);
        if (!cancelled) setSelectedDetail(fresh);
      } catch {
        if (!cancelled) setSelectedDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = selectedDetail;

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const fresh = await suppliersApi.get(selected.id);
      setSelectedDetail(fresh);
      setSuppliers((ss) => ss.map((s) => (s.id === fresh.id ? fresh : s)));
    } catch {
      // ignore
    }
  };

  const buildRowMenu = (s: ApiSupplier): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Editar", icon: I.edit, onClick: () => setEditTarget(s) },
    ];
    if (s.isActive) {
      items.push({
        label: "Desactivar",
        icon: I.x,
        kind: "danger",
        onClick: () => setDeactivateTarget(s),
      });
    } else {
      items.push({
        label: "Activar",
        icon: I.check,
        onClick: async () => {
          setActionError(null);
          try {
            await suppliersApi.activate(s.id);
            await reload(page);
          } catch (err) {
            setActionError(
              err instanceof ApiError
                ? err.message
                : "No se pudo activar el proveedor.",
            );
          }
        },
      });
    }
    return items;
  };

  const subText = `${total} proveedor${total === 1 ? "" : "es"}${
    showInactive ? " · incluyendo inactivos" : ""
  }`;

  return (
    <>
      <PageHeader
        title="Proveedores"
        sub={subText}
        actions={
          <button className="btn btn--accent" onClick={() => setShowNew(true)}>
            <span>{I.plus}</span>Nuevo proveedor
          </button>
        }
      />

      {(loadError || actionError) && (
        <div
          className="card mb-3 flex items-start gap-2"
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
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Cerrar"
            >
              {I.x}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card">
          <div className="card__head gap-2 flex-wrap">
            <div className="topbar__search m-0 relative" style={{ width: 240 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, servicio…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar"
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  {I.x}
                </button>
              )}
            </div>
            <button
              className={`btn btn--sm ${showInactive ? "btn--primary" : "btn--ghost"}`}
              onClick={toggleInactive}
              title="Incluir proveedores inactivos"
            >
              + Inactivos
            </button>
            <div className="spacer" />
            <select
              className="input"
              style={{ width: 220, height: 32, fontSize: 12 }}
              value={orderBy}
              onChange={(e) => changeOrderBy(e.target.value as OrderByKey)}
              aria-label="Ordenar por"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  Orden: {o.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="card__body text-muted text-sm">Cargando…</div>
          ) : suppliers.length === 0 ? (
            <div className="card__body text-muted text-sm">
              {debounced
                ? "Sin coincidencias."
                : "Sin proveedores. Crea uno con el botón de arriba."}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Servicio</th>
                  <th className="text-right">Lead</th>
                  <th>Confiabilidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      background: selectedId === s.id ? "var(--surface-2)" : "",
                      opacity: s.isActive ? 1 : 0.6,
                    }}
                  >
                    <td>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-muted text-[11px]">
                        {s.contact ?? s.email ?? s.phone ?? "—"}
                        {!s.isActive && " · Inactivo"}
                      </div>
                    </td>
                    <td>{s.service ?? <span className="text-muted">—</span>}</td>
                    <td className="num text-right">{s.leadDays}d</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 bg-surface-3 rounded-sm"
                          style={{ height: 4 }}
                        >
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${s.reliability}%`,
                              background: reliabilityColor(s.reliability),
                            }}
                          />
                        </div>
                        <span className="num text-xs">{s.reliability}%</span>
                      </div>
                    </td>
                    <td>
                      <MenuButton trigger={I.more} items={buildRowMenu(s)} />
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
                ? "Sin proveedores"
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

        {selected ? (
          <SupplierDetailPanel
            supplier={selected}
            onEdit={() => setEditTarget(selected)}
            onDeactivate={() => setDeactivateTarget(selected)}
            onActivate={async () => {
              setActionError(null);
              try {
                await suppliersApi.activate(selected.id);
                await reload(page);
                await refreshSelected();
              } catch (err) {
                setActionError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo activar el proveedor.",
                );
              }
            }}
          />
        ) : (
          <div className="card self-start">
            <div className="card__body text-muted text-sm">
              Selecciona un proveedor para ver detalles.
            </div>
          </div>
        )}
      </div>

      {/* TODO: sección "Pedidos a proveedor en curso" cuando exista el módulo de compras. */}

      {showNew && (
        <SupplierFormModal
          mode="create"
          onClose={() => setShowNew(false)}
          onDone={async (id) => {
            setShowNew(false);
            if (id) setSelectedId(id);
            await reload(page);
          }}
        />
      )}

      {editTarget && (
        <SupplierFormModal
          mode="edit"
          supplier={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            setEditTarget(null);
            await refreshSelected();
            await reload(page);
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desactivar proveedor"
          kind="danger"
          confirmLabel="Desactivar"
          message={
            <>
              ¿Desactivar{" "}
              <span className="font-medium text-ink-2">
                {deactivateTarget.name}
              </span>
              ? Dejará de aparecer en la lista de proveedores activos pero su
              histórico se conserva.
            </>
          }
          onClose={() => setDeactivateTarget(null)}
          onConfirm={async () => {
            try {
              await suppliersApi.deactivate(deactivateTarget.id);
              setDeactivateTarget(null);
              await reload(page);
              await refreshSelected();
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo desactivar el proveedor.",
              );
            }
          }}
        />
      )}
    </>
  );
}

function SupplierDetailPanel({
  supplier,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  supplier: ApiSupplier;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="card self-start">
      <div className="card__body pb-0">
        <div className="text-lg font-semibold" style={{ letterSpacing: "-.01em" }}>
          {supplier.name}
        </div>
        <div className="text-muted text-xs">
          {supplier.service ?? "Sin servicio"}
          {!supplier.isActive && (
            <>
              {" · "}
              <span style={{ color: "var(--danger)" }}>Inactivo</span>
            </>
          )}
        </div>

        <div className="divider" style={{ margin: "12px 0" }} />

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Kv label="Contacto" v={supplier.contact ?? "—"} />
          <Kv label="Teléfono" v={supplier.phone ?? "—"} />
          <Kv label="Email" v={supplier.email ?? "—"} />
          <Kv label="RFC" v={supplier.rfc ?? "—"} />
          <Kv label="Lead time" v={`${supplier.leadDays} días`} />
          <Kv
            label="Confiabilidad"
            v={
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 bg-surface-3 rounded-sm"
                  style={{ height: 4, minWidth: 60 }}
                >
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${supplier.reliability}%`,
                      background: reliabilityColor(supplier.reliability),
                    }}
                  />
                </div>
                <span className="num text-xs">{supplier.reliability}%</span>
              </div>
            }
          />
        </div>

        {supplier.notes && (
          <>
            <div className="divider" style={{ margin: "12px 0" }} />
            <div className="text-muted text-[11px]">Notas</div>
            <div
              className="text-[13px]"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {supplier.notes}
            </div>
          </>
        )}
      </div>

      <div className="divider m-0 mt-3" />

      <div className="px-4 py-3 flex gap-2 flex-wrap">
        <button className="btn btn--sm" onClick={onEdit}>
          {I.edit} Editar
        </button>
        {supplier.isActive ? (
          <button className="btn btn--sm btn--danger" onClick={onDeactivate}>
            {I.x} Desactivar
          </button>
        ) : (
          <button className="btn btn--sm btn--accent" onClick={onActivate}>
            {I.check} Activar
          </button>
        )}
      </div>
    </div>
  );
}

function Kv({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted text-[11px]">{label}</div>
      <div>{v}</div>
    </div>
  );
}

function SupplierFormModal({
  mode,
  supplier,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  supplier?: ApiSupplier;
  onClose: () => void;
  onDone: (createdId?: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [service, setService] = useState(supplier?.service ?? "");
  const [contact, setContact] = useState(supplier?.contact ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [rfc, setRfc] = useState(supplier?.rfc ?? "");
  const [leadDays, setLeadDays] = useState(String(supplier?.leadDays ?? 0));
  const [reliability, setReliability] = useState(
    String(supplier?.reliability ?? 100),
  );
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const leadNum = Number(leadDays);
    const relNum = Number(reliability);
    if (!Number.isInteger(leadNum) || leadNum < 0) {
      setError("Lead days debe ser un entero >= 0.");
      return;
    }
    if (!Number.isInteger(relNum) || relNum < 0 || relNum > 100) {
      setError("Confiabilidad debe estar entre 0 y 100.");
      return;
    }

    const payload = {
      name: name.trim(),
      service: service.trim() || null,
      contact: contact.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      rfc: rfc.trim() || null,
      leadDays: leadNum,
      reliability: relNum,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const { id } = await suppliersApi.create(payload);
        await onDone(id);
      } else if (supplier) {
        await suppliersApi.update(supplier.id, payload);
        await onDone();
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ya existe un proveedor con ese nombre."
            : err.message
          : mode === "create"
            ? "No se pudo crear el proveedor."
            : "No se pudieron guardar los cambios.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="supplier-form"
            disabled={submitting}
          >
            {submitting
              ? "Guardando…"
              : mode === "create"
                ? "Crear proveedor"
                : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <div className="field col-span-full">
          <span className="label">Nombre</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="Lonas del Bajío"
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Servicio</span>
          <input
            className="input"
            value={service}
            onChange={(e) => setService(e.target.value)}
            maxLength={120}
            placeholder="Lonas y vinil, placas de fotograbado…"
          />
        </div>
        <div className="field">
          <span className="label">Contacto</span>
          <input
            className="input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={120}
            placeholder="Pedro Núñez"
          />
        </div>
        <div className="field">
          <span className="label">Teléfono</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            placeholder="55 1234 5678"
          />
        </div>
        <div className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={180}
            placeholder="contacto@proveedor.mx"
          />
        </div>
        <div className="field">
          <span className="label">RFC</span>
          <input
            className="input"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            maxLength={13}
            placeholder="XAXX010101000"
          />
        </div>
        <div className="field">
          <span className="label">Lead time (días)</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">Confiabilidad (0-100)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            step={1}
            value={reliability}
            onChange={(e) => setReliability(e.target.value)}
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Notas</span>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            placeholder="Acuerdos, condiciones de pago, observaciones…"
          />
        </div>
        {error && (
          <div
            className="col-span-full rounded-md text-xs"
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
