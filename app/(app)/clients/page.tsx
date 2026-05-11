"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { auditApi, type ApiAuditEntry } from "@/lib/api/audit";
import {
  clientsApi,
  type ClientAddressInput,
} from "@/lib/api/clients";
import { ApiError } from "@/lib/api/errors";
import type {
  ApiClient,
  ApiClientAddress,
  ApiClientAddressType,
  ApiClientType,
  ApiUser,
} from "@/lib/api/types";
import { tokenStorage } from "@/lib/auth/tokens";
import { usersApi } from "@/lib/api/users";
import { fmtDate } from "@/lib/format";

type FilterKey = "Todos" | "Frecuentes" | "Con crédito" | "Inactivos";
type TypeFilter = "all" | ApiClientType;
type OrderByKey = "createdAt" | "name" | "updatedAt";

const FILTERS: FilterKey[] = ["Todos", "Frecuentes", "Con crédito", "Inactivos"];

const ORDER_OPTIONS: { key: OrderByKey; label: string }[] = [
  { key: "createdAt", label: "Más recientes" },
  { key: "name", label: "Nombre (A-Z)" },
  { key: "updatedAt", label: "Última modificación" },
];

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

function auditActionLabel(action: string): string {
  switch (action) {
    case "clients.client.created":
      return "Creado";
    case "clients.client.updated":
      return "Modificado";
    case "clients.client.deactivated":
      return "Desactivado";
    case "clients.client.reactivated":
      return "Reactivado";
    case "clients.address.added":
      return "Dirección agregada";
    case "clients.address.updated":
      return "Dirección modificada";
    case "clients.address.removed":
      return "Dirección eliminada";
    default:
      return action;
  }
}

function addressTypeLabel(t: ApiClientAddressType): string {
  switch (t) {
    case "billing":
      return "Fiscal";
    case "delivery":
      return "Entrega";
    case "other":
      return "Otra";
  }
}

async function downloadCsv(
  filters: {
    search?: string;
    tag?: string;
    tagStartsWith?: string;
    isActive?: boolean;
    type?: ApiClientType;
  },
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") search.set(k, v ? "true" : "false");
    else search.set(k, String(v));
  }
  const token = tokenStorage.read()?.accessToken;
  const res = await fetch(
    `${base}/clients/export.csv${search.toString() ? `?${search.toString()}` : ""}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error(`Export falló: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [orderBy, setOrderBy] = useState<OrderByKey>("createdAt");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiClient | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<ApiAuditEntry | null>(
    null,
  );
  const [selectedHistory, setSelectedHistory] = useState<ApiAuditEntry[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [addressTarget, setAddressTarget] = useState<
    { client: ApiClient; address: ApiClientAddress | null } | null
  >(null);
  const [removeAddressTarget, setRemoveAddressTarget] = useState<
    { client: ApiClient; address: ApiClientAddress } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiClient | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiClient | null>(
    null,
  );

  const actorById = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  // Lista de usuarios sólo para resolver nombres en la auditoría. Falla silenciosa.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await usersApi.list({ take: 100 });
        if (!cancelled) setUsers(res.items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const changeTypeFilter = (t: TypeFilter) => {
    setTypeFilter(t);
    setPage(1);
  };

  const changeOrderBy = (o: OrderByKey) => {
    setOrderBy(o);
    setPage(1);
  };

  const filterParams = useMemo<{
    tag?: string;
    tagStartsWith?: string;
    isActive?: boolean;
  }>(() => {
    switch (filter) {
      case "Frecuentes":
        return { tag: "Frecuente" };
      case "Con crédito":
        return { tagStartsWith: "Crédito" };
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
        type: typeFilter === "all" ? undefined : typeFilter,
        orderBy,
        order: orderBy === "name" ? "asc" : "desc",
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
  }, [page, filter, debounced, typeFilter, orderBy]);

  // Carga el detalle, la última entrada de auditoría y el histórico del
  // cliente seleccionado. Independiente de la lista paginada para que el
  // panel sobreviva a cambios de filtro/orden.
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDetail(null);
      setSelectedAudit(null);
      setSelectedHistory([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [detail, history] = await Promise.all([
          clientsApi.get(selectedId),
          auditApi.list({ target: `client:${selectedId}`, take: 10 }),
        ]);
        if (cancelled) return;
        setSelectedDetail(detail);
        setSelectedAudit(history.items[0] ?? null);
        setSelectedHistory(history.items);
      } catch {
        if (!cancelled) {
          // Si el cliente fue borrado, deselecciona.
          setSelectedDetail(null);
          setSelectedAudit(null);
          setSelectedHistory([]);
        }
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
      const fresh = await clientsApi.get(selected.id);
      setSelectedDetail(fresh);
      setClients((cs) => cs.map((c) => (c.id === fresh.id ? fresh : c)));
      // Refrescar también el histórico de auditoría.
      const history = await auditApi.list({
        target: `client:${fresh.id}`,
        take: 10,
      });
      setSelectedAudit(history.items[0] ?? null);
      setSelectedHistory(history.items);
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
          <>
            <button
              className="btn"
              onClick={async () => {
                setActionError(null);
                try {
                  await downloadCsv({
                    search: debounced || undefined,
                    type: typeFilter === "all" ? undefined : typeFilter,
                    ...filterParams,
                  });
                } catch (err) {
                  setActionError(
                    err instanceof Error
                      ? err.message
                      : "No se pudo exportar el CSV.",
                  );
                }
              }}
            >
              <span>{I.download}</span>Exportar CSV
            </button>
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              <span>{I.plus}</span>Nuevo cliente
            </button>
          </>
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
          <div className="card__head gap-2 flex-wrap">
            <div className="topbar__search m-0 relative" style={{ width: 260 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, RFC, teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
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
            <div className="row gap-1">
              <button
                className={`btn btn--sm ${
                  typeFilter === "all" ? "btn--primary" : "btn--ghost"
                }`}
                onClick={() => changeTypeFilter("all")}
                title="Todos los tipos"
              >
                Todos
              </button>
              <button
                className={`btn btn--sm ${
                  typeFilter === "business" ? "btn--primary" : "btn--ghost"
                }`}
                onClick={() => changeTypeFilter("business")}
              >
                Negocio
              </button>
              <button
                className={`btn btn--sm ${
                  typeFilter === "individual" ? "btn--primary" : "btn--ghost"
                }`}
                onClick={() => changeTypeFilter("individual")}
              >
                Persona
              </button>
            </div>
            <div className="spacer" />
            <select
              className="input"
              style={{ width: 180, height: 32, fontSize: 12 }}
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
            audit={selectedAudit}
            history={selectedHistory}
            actorById={actorById}
            onEdit={() => setEditTarget(selected)}
            onDeactivate={() => setDeactivateTarget(selected)}
            onAddAddress={() =>
              setAddressTarget({ client: selected, address: null })
            }
            onEditAddress={(addr) =>
              setAddressTarget({ client: selected, address: addr })
            }
            onRemoveAddress={(addr) =>
              setRemoveAddressTarget({ client: selected, address: addr })
            }
            onActivate={async () => {
              setActionError(null);
              try {
                await clientsApi.activate(selected.id);
                await reload(page);
                await refreshSelected();
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

      {addressTarget && (
        <AddressFormModal
          clientId={addressTarget.client.id}
          address={addressTarget.address}
          onClose={() => setAddressTarget(null)}
          onDone={async () => {
            setAddressTarget(null);
            await refreshSelected();
          }}
        />
      )}

      {removeAddressTarget && (
        <ConfirmDialog
          title="Eliminar dirección"
          kind="danger"
          confirmLabel="Eliminar"
          message={
            <>
              ¿Eliminar la dirección{" "}
              <span className="font-medium text-ink-2">
                {removeAddressTarget.address.label ??
                  removeAddressTarget.address.line1}
              </span>
              ? Esta acción no se puede deshacer.
            </>
          }
          onClose={() => setRemoveAddressTarget(null)}
          onConfirm={async () => {
            try {
              await clientsApi.removeAddress(
                removeAddressTarget.client.id,
                removeAddressTarget.address.id,
              );
              setRemoveAddressTarget(null);
              await refreshSelected();
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo eliminar la dirección.",
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
  audit,
  history,
  actorById,
  onEdit,
  onDeactivate,
  onActivate,
  onAddAddress,
  onEditAddress,
  onRemoveAddress,
}: {
  client: ApiClient;
  audit: ApiAuditEntry | null;
  history: ApiAuditEntry[];
  actorById: Map<string, ApiUser>;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onAddAddress: () => void;
  onEditAddress: (addr: ApiClientAddress) => void;
  onRemoveAddress: (addr: ApiClientAddress) => void;
}) {
  const actorLabel = (entry: ApiAuditEntry): string => {
    if (!entry.actorId) return "sistema";
    const u = actorById.get(entry.actorId);
    return u ? u.name : `${entry.actorId.slice(0, 8)}…`;
  };

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
            {audit && (
              <div className="text-muted text-[11px] mt-1">
                {auditActionLabel(audit.action)} por{" "}
                <span className="font-medium text-ink-2">
                  {actorLabel(audit)}
                </span>{" "}
                · {formatDateTime(audit.createdAt)}
              </div>
            )}
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

      {(client.additionalPhones.length > 0 ||
        client.additionalEmails.length > 0) && (
        <>
          <div className="divider m-0 mt-3" />
          <div className="card__body py-3">
            <div className="text-muted text-[11px] mb-2">
              Contactos adicionales
            </div>
            {client.additionalPhones.length > 0 && (
              <div className="text-[12px] mb-1">
                <span className="text-muted-2 mr-1">Tel:</span>
                {client.additionalPhones.map((p, i) => (
                  <span key={i} className="tag mr-1">
                    {p}
                  </span>
                ))}
              </div>
            )}
            {client.additionalEmails.length > 0 && (
              <div className="text-[12px]">
                <span className="text-muted-2 mr-1">Mail:</span>
                {client.additionalEmails.map((m, i) => (
                  <span key={i} className="tag mr-1">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="divider m-0 mt-3" />

      <div
        className="card__head"
        style={{ borderTop: 0 }}
      >
        <div className="card__title">
          Direcciones{" "}
          <span className="text-muted text-xs font-normal">
            ({client.addresses.length})
          </span>
        </div>
        <div className="spacer" />
        <button className="btn btn--sm" onClick={onAddAddress}>
          {I.plus} Agregar
        </button>
      </div>
      {client.addresses.length === 0 ? (
        <div className="card__body text-muted text-sm py-2">
          Sin direcciones registradas.
        </div>
      ) : (
        <div>
          {client.addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-start gap-2 px-4 py-2.5 text-[12px]"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="tag">{addressTypeLabel(addr.type)}</span>
                  {addr.label && (
                    <span className="font-medium">{addr.label}</span>
                  )}
                </div>
                <div className="text-muted mt-0.5">{addr.line1}</div>
                {addr.line2 && (
                  <div className="text-muted">{addr.line2}</div>
                )}
                <div className="text-muted-2 text-[11px] mt-0.5">
                  {[addr.city, addr.state, addr.postalCode, addr.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
              <MenuButton
                trigger={I.more}
                items={[
                  {
                    label: "Editar dirección",
                    icon: I.edit,
                    onClick: () => onEditAddress(addr),
                  },
                  {
                    label: "Eliminar",
                    icon: I.x,
                    kind: "danger",
                    onClick: () => onRemoveAddress(addr),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      <div className="divider m-0" />

      <div
        className="card__head"
        style={{ borderTop: 0 }}
      >
        <div className="card__title">Historial</div>
        <div className="spacer" />
        <span className="text-muted text-xs">
          {history.length === 0 ? "—" : `últimos ${history.length}`}
        </span>
      </div>
      {history.length === 0 ? (
        <div className="card__body text-muted text-sm py-2">
          Sin eventos registrados.
        </div>
      ) : (
        <div className="px-4 pb-3">
          {history.map((e) => (
            <div
              key={e.id}
              className="text-[12px] py-1.5 flex items-baseline gap-2"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <span className="text-muted-2 num text-[11px]">
                {formatDateTime(e.createdAt)}
              </span>
              <span className="flex-1">
                {auditActionLabel(e.action)}{" "}
                <span className="text-muted">por</span>{" "}
                <span className="font-medium">{actorLabel(e)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="divider m-0" />

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
  const [additionalPhones, setAdditionalPhones] = useState<string[]>(
    () => [...(client?.additionalPhones ?? [])],
  );
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(
    () => [...(client?.additionalEmails ?? [])],
  );
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
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

  const addPhone = () => {
    const v = newPhone.trim();
    if (v.length === 0 || additionalPhones.includes(v)) return;
    setAdditionalPhones((p) => [...p, v]);
    setNewPhone("");
  };
  const addEmail = () => {
    const v = newEmail.trim();
    if (v.length === 0 || additionalEmails.includes(v)) return;
    setAdditionalEmails((p) => [...p, v]);
    setNewEmail("");
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
      additionalPhones,
      additionalEmails,
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
        <div className="field col-span-full">
          <span className="label">Teléfonos adicionales</span>
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {additionalPhones.length === 0 && (
              <span className="text-muted text-xs">Ninguno.</span>
            )}
            {additionalPhones.map((p, i) => (
              <span key={i} className="tag flex items-center gap-1">
                {p}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Quitar"
                  onClick={() =>
                    setAdditionalPhones((arr) => arr.filter((_, j) => j !== i))
                  }
                  style={{ width: 16, height: 16, padding: 0 }}
                >
                  {I.x}
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              className="input"
              placeholder="55 0000 0000"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPhone();
                }
              }}
              maxLength={32}
            />
            <button
              type="button"
              className="btn btn--sm"
              onClick={addPhone}
              disabled={newPhone.trim().length === 0}
            >
              Agregar
            </button>
          </div>
        </div>
        <div className="field col-span-full">
          <span className="label">Correos adicionales</span>
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {additionalEmails.length === 0 && (
              <span className="text-muted text-xs">Ninguno.</span>
            )}
            {additionalEmails.map((m, i) => (
              <span key={i} className="tag flex items-center gap-1">
                {m}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Quitar"
                  onClick={() =>
                    setAdditionalEmails((arr) => arr.filter((_, j) => j !== i))
                  }
                  style={{ width: 16, height: 16, padding: 0 }}
                >
                  {I.x}
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              className="input"
              type="email"
              placeholder="secundario@cliente.mx"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              maxLength={120}
            />
            <button
              type="button"
              className="btn btn--sm"
              onClick={addEmail}
              disabled={newEmail.trim().length === 0}
            >
              Agregar
            </button>
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

function AddressFormModal({
  clientId,
  address,
  onClose,
  onDone,
}: {
  clientId: string;
  address: ApiClientAddress | null;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const mode = address ? "edit" : "create";
  const [type, setType] = useState<ApiClientAddressType>(
    address?.type ?? "billing",
  );
  const [label, setLabel] = useState(address?.label ?? "");
  const [line1, setLine1] = useState(address?.line1 ?? "");
  const [line2, setLine2] = useState(address?.line2 ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [state, setState] = useState(address?.state ?? "");
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? "");
  const [country, setCountry] = useState(address?.country ?? "MX");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (line1.trim().length === 0) {
      setError("La dirección principal (línea 1) es obligatoria.");
      return;
    }
    const payload: ClientAddressInput = {
      type,
      label: label.trim() || null,
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      postalCode: postalCode.trim() || null,
      country: country.trim() || null,
    };
    setSubmitting(true);
    try {
      if (mode === "create") {
        await clientsApi.addAddress(clientId, payload);
      } else if (address) {
        await clientsApi.updateAddress(clientId, address.id, payload);
      }
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la dirección.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Agregar dirección" : "Editar dirección"}
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
            form="address-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <form id="address-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="field col-span-full">
          <span className="label">Tipo</span>
          <div className="flex gap-1.5">
            {(["billing", "delivery", "other"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn--sm ${type === t ? "btn--primary" : ""}`}
                onClick={() => setType(t)}
              >
                {addressTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>
        <div className="field col-span-full">
          <span className="label">Etiqueta (opcional)</span>
          <input
            className="input"
            placeholder="Ej. Bodega Norte"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Calle y número</span>
          <input
            className="input"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Colonia / referencias</span>
          <input
            className="input"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="field">
          <span className="label">Ciudad</span>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="field">
          <span className="label">Estado</span>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="field">
          <span className="label">CP</span>
          <input
            className="input"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={10}
          />
        </div>
        <div className="field">
          <span className="label">País</span>
          <input
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
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
