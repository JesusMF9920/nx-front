"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { clientsApi } from "@/lib/api/clients";
import { ApiError } from "@/lib/api/errors";
import type { ApiClient, ApiClientType } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";

type FilterKey = "Todos" | "Frecuentes" | "Con crédito" | "Inactivos";

const FILTERS: FilterKey[] = ["Todos", "Frecuentes", "Con crédito", "Inactivos"];

const SUGGESTED_TAGS = [
  "Frecuente",
  "Mayoreo",
  "Crédito 15",
  "Crédito 30",
  "VIP",
  "Sin facturación",
];

const PAGE_SIZE = 25;

function typeLabel(t: ApiClientType): string {
  return t === "business" ? "Negocio" : "Persona física";
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("Todos");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiClient | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiClient | null>(
    null,
  );

  // Debounce de búsqueda (250ms). Resetea page al mismo tiempo para que
  // la siguiente fetch sea atómica con el nuevo término.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const changeFilter = (f: FilterKey) => {
    setFilter(f);
    setPage(1);
  };

  const filterParams = useMemo<{
    tag?: string;
    isActive?: boolean;
  }>(() => {
    switch (filter) {
      case "Frecuentes":
        return { tag: "Frecuente" };
      case "Con crédito":
        return { tag: "Crédito 30" }; // TODO: backend no soporta tag-starts-with
      case "Inactivos":
        return { isActive: false };
      default:
        return {};
    }
  }, [filter]);

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await clientsApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        ...filterParams,
      });
      setClients(res.items);
      setTotal(res.total);
      if (!selectedId && res.items.length > 0) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los clientes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, debounced]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) ?? null,
    [clients, selectedId],
  );

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const fresh = await clientsApi.get(selected.id);
      setClients((cs) => cs.map((c) => (c.id === fresh.id ? fresh : c)));
    } catch {
      // ignore — el reload general lo arregla
    }
  };

  const buildRowMenu = (c: ApiClient): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Editar", icon: I.edit, onClick: () => setEditTarget(c) },
    ];
    if (c.isActive) {
      items.push({
        label: "Desactivar",
        icon: I.x,
        kind: "danger",
        onClick: () => setDeactivateTarget(c),
      });
    } else {
      items.push({
        label: "Activar",
        icon: I.check,
        onClick: async () => {
          setActionError(null);
          try {
            await clientsApi.activate(c.id);
            await reload(page);
          } catch (err) {
            setActionError(
              err instanceof ApiError
                ? err.message
                : "No se pudo activar el cliente.",
            );
          }
        },
      });
    }
    return items;
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        sub={`${total} clientes${filter !== "Todos" ? ` · filtrado: ${filter}` : ""}`}
        actions={
          <button className="btn btn--accent" onClick={() => setShowNew(true)}>
            <span>{I.plus}</span>Nuevo cliente
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
              onClick={() => setActionError(null)}
              aria-label="Cerrar mensaje"
              type="button"
            >
              {I.x}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card">
          <div className="card__head gap-2">
            <div className="topbar__search m-0" style={{ width: 260 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, RFC, teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="row gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`btn btn--sm ${
                    filter === f ? "btn--primary" : "btn--ghost"
                  }`}
                  onClick={() => changeFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="spacer" />
          </div>

          {loading ? (
            <div className="card__body text-muted text-sm">Cargando…</div>
          ) : clients.length === 0 ? (
            <div className="card__body text-muted text-sm">
              {debounced || filter !== "Todos"
                ? "No hay coincidencias."
                : "No hay clientes. Crea uno con el botón de arriba."}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Etiquetas</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      background: selectedId === c.id ? "var(--surface-2)" : "",
                      opacity: c.isActive ? 1 : 0.7,
                    }}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={26} />
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-muted text-[11px]">
                            {typeLabel(c.type)}
                            {c.rfc && ` · ${c.rfc}`}
                            {!c.isActive && " · Inactivo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">{c.contact ?? "—"}</div>
                      <div className="text-muted text-[11px]">{c.phone ?? "—"}</div>
                    </td>
                    <td>
                      {c.tags.length === 0 ? (
                        <span className="text-muted text-xs">—</span>
                      ) : (
                        c.tags.slice(0, 2).map((t) => (
                          <span key={t} className="tag mr-1">
                            {t}
                          </span>
                        ))
                      )}
                      {c.tags.length > 2 && (
                        <span className="text-muted text-[11px]">
                          +{c.tags.length - 2}
                        </span>
                      )}
                    </td>
                    <td className="num text-muted">{fmtDate(c.createdAt)}</td>
                    <td>
                      <MenuButton trigger={I.more} items={buildRowMenu(c)} />
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
                ? "Sin clientes"
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
          <ClientDetailPanel
            client={selected}
            onEdit={() => setEditTarget(selected)}
            onDeactivate={() => setDeactivateTarget(selected)}
            onActivate={async () => {
              setActionError(null);
              try {
                await clientsApi.activate(selected.id);
                await reload(page);
              } catch (err) {
                setActionError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo activar el cliente.",
                );
              }
            }}
          />
        ) : (
          <div className="card self-start">
            <div className="card__body text-muted text-sm">
              Selecciona un cliente para ver detalles.
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <ClientFormModal
          mode="create"
          onClose={() => setShowNew(false)}
          onDone={async (createdId) => {
            setShowNew(false);
            if (createdId) setSelectedId(createdId);
            await reload(page);
          }}
        />
      )}

      {editTarget && (
        <ClientFormModal
          mode="edit"
          client={editTarget}
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
          title="Desactivar cliente"
          kind="danger"
          confirmLabel="Desactivar"
          message={
            <>
              ¿Desactivar a{" "}
              <span className="font-medium text-ink-2">
                {deactivateTarget.name}
              </span>
              ? Dejará de aparecer en los filtros activos pero su histórico se
              conserva.
            </>
          }
          onClose={() => setDeactivateTarget(null)}
          onConfirm={async () => {
            try {
              await clientsApi.deactivate(deactivateTarget.id);
              setDeactivateTarget(null);
              await reload(page);
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo desactivar al cliente.",
              );
            }
          }}
        />
      )}
    </>
  );
}

function ClientDetailPanel({
  client,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  client: ApiClient;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="card self-start">
      <div className="card__body pb-0">
        <div className="flex gap-3.5 items-start">
          <Avatar name={client.name} size={48} />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold" style={{ letterSpacing: "-.01em" }}>
              {client.name}
            </div>
            <div className="text-muted text-xs">
              {typeLabel(client.type)} · alta {fmtDate(client.createdAt)}
              {!client.isActive && (
                <>
                  {" · "}
                  <span style={{ color: "var(--danger)" }}>Inactivo</span>
                </>
              )}
            </div>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {client.tags.length === 0 ? (
                <span className="tag text-muted-2">sin etiquetas</span>
              ) : (
                client.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="divider" style={{ margin: "16px 0 12px" }} />

        <div className="grid grid-cols-2 gap-3">
          <DetailKV icon={I.phone} label="Teléfono" v={client.phone ?? "—"} />
          <DetailKV icon={I.mail} label="Correo" v={client.email ?? "—"} />
          <DetailKV icon={I.tag} label="RFC" v={client.rfc ?? "—"} />
          <DetailKV icon={I.user} label="Contacto" v={client.contact ?? "—"} />
          {client.taxRegimen && (
            <DetailKV
              icon={I.receipt}
              label="Régimen fiscal"
              v={client.taxRegimen}
            />
          )}
        </div>

        {client.notes && (
          <>
            <div className="divider" style={{ margin: "12px 0" }} />
            <div className="text-xs">
              <div className="text-muted text-[11px] mb-1">Notas internas</div>
              <div className="whitespace-pre-wrap">{client.notes}</div>
            </div>
          </>
        )}
      </div>

      <div className="divider m-0 mt-3" />

      <div className="px-4 py-3 flex gap-2 flex-wrap">
        <button className="btn btn--sm" onClick={onEdit}>
          {I.edit} Editar
        </button>
        {client.isActive ? (
          <button className="btn btn--sm btn--danger" onClick={onDeactivate}>
            {I.x} Desactivar
          </button>
        ) : (
          <button className="btn btn--sm btn--accent" onClick={onActivate}>
            {I.check} Activar
          </button>
        )}
      </div>

      {/* TODO: cuando exista el módulo de pedidos, listar aquí los pedidos del cliente */}
    </div>
  );
}

function DetailKV({
  icon,
  label,
  v,
}: {
  icon: React.ReactNode;
  label: string;
  v: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 items-start text-[13px]">
      <span className="text-muted mt-0.5">{icon}</span>
      <div>
        <div className="text-muted text-[11px]">{label}</div>
        <div>{v}</div>
      </div>
    </div>
  );
}

function ClientFormModal({
  mode,
  client,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  client?: ApiClient;
  onClose: () => void;
  onDone: (createdId?: string) => void | Promise<void>;
}) {
  const [type, setType] = useState<ApiClientType>(client?.type ?? "business");
  const [name, setName] = useState(client?.name ?? "");
  const [rfc, setRfc] = useState(client?.rfc ?? "");
  const [contact, setContact] = useState(client?.contact ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [taxRegimen, setTaxRegimen] = useState(client?.taxRegimen ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [tags, setTags] = useState<Set<string>>(
    () => new Set(client?.tags ?? []),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("El nombre es obligatorio.");
      return;
    }
    const payload = {
      name: trimmedName,
      type,
      contact: contact.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      rfc: rfc.trim() || null,
      taxRegimen: taxRegimen.trim() || null,
      notes: notes.trim() || null,
      tags: [...tags],
    };
    setSubmitting(true);
    try {
      if (mode === "create") {
        const { id } = await clientsApi.create(payload);
        await onDone(id);
      } else if (client) {
        await clientsApi.update(client.id, payload);
        await onDone();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : mode === "create"
            ? "No se pudo crear el cliente."
            : "No se pudieron guardar los cambios.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Nuevo cliente" : "Editar cliente"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="client-form"
            disabled={submitting}
          >
            {submitting
              ? "Guardando…"
              : mode === "create"
                ? "Crear cliente"
                : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <div className="field col-span-full">
          <span className="label">Tipo</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={`btn btn--sm ${type === "business" ? "btn--primary" : ""}`}
              onClick={() => setType("business")}
            >
              Negocio
            </button>
            <button
              type="button"
              className={`btn btn--sm ${type === "individual" ? "btn--primary" : ""}`}
              onClick={() => setType("individual")}
            >
              Persona física
            </button>
          </div>
        </div>
        <div className="field">
          <span className="label">
            {type === "business" ? "Razón social" : "Nombre"}
          </span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="field">
          <span className="label">RFC</span>
          <input
            className="input"
            placeholder="XXX000000XXX"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            maxLength={13}
          />
        </div>
        <div className="field">
          <span className="label">Persona de contacto</span>
          <input
            className="input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="field">
          <span className="label">Teléfono</span>
          <input
            className="input"
            placeholder="55 0000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={32}
          />
        </div>
        <div className="field">
          <span className="label">Correo</span>
          <input
            className="input"
            type="email"
            placeholder="contacto@cliente.mx"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="field">
          <span className="label">Régimen fiscal</span>
          <select
            className="select"
            value={taxRegimen}
            onChange={(e) => setTaxRegimen(e.target.value)}
          >
            <option value="">—</option>
            <option value="601">601 — Régimen general</option>
            <option value="612">612 — Persona física</option>
            <option value="603">603 — No lucrativas</option>
            <option value="626">626 — Simplificado de confianza</option>
          </select>
        </div>
        <div className="field col-span-full">
          <span className="label">Notas internas</span>
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Preferencias, restricciones, contactos secundarios…"
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Etiquetas</span>
          <div className="flex gap-1.5 flex-wrap">
            {SUGGESTED_TAGS.map((t) => {
              const on = tags.has(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`btn btn--sm ${on ? "btn--primary" : ""}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
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
