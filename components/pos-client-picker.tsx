"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { clientsApi } from "@/lib/api/clients";
import { ApiError } from "@/lib/api/errors";
import type { ApiClient, ApiClientType } from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";

type Props = {
  onClose: () => void;
  onSelect: (client: ApiClient) => void;
};

/**
 * ¿El texto buscado parece un teléfono? Decide a qué campo va el prellenado
 * del alta rápida (≥7 dígitos una vez quitado el formato y sin letras).
 */
export function looksLikePhone(text: string): boolean {
  const trimmed = text.trim();
  if (/[a-záéíóúñ]/i.test(trimmed)) return false;
  return trimmed.replace(/\D/g, "").length >= 7;
}

function ClientRow({
  client,
  onSelect,
  first,
}: {
  client: ApiClient;
  onSelect: (c: ApiClient) => void;
  first: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(client)}
      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer bg-transparent"
      style={{ borderTop: first ? 0 : "1px solid var(--line)" }}
    >
      <Avatar name={client.name} size={28} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px]">{client.name}</div>
        <div className="text-muted text-[11px]">
          {[client.phone, client.rfc, client.email].filter(Boolean).join(" · ") ||
            "Sin datos de contacto"}
        </div>
      </div>
      <span className="tag text-[10px]">
        {client.type === "business" ? "Negocio" : "Persona física"}
      </span>
    </button>
  );
}

export function PosClientPicker({ onClose, onSelect }: Props) {
  const canCreate = usePermission("clients.write");
  const [mode, setMode] = useState<"search" | "create">("search");

  // ── Búsqueda ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Alta rápida (solo nombre y teléfono obligatorios) ─────────────────
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<ApiClientType>("individual");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /** Posibles duplicados mientras se teclea — sugerencia, no bloqueo. */
  const [dupes, setDupes] = useState<ApiClient[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const reload = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await clientsApi.list({
        search: debounced || undefined,
        isActive: true,
        take: 20,
        orderBy: "name",
        order: "asc",
      });
      setClients(res.items);
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
    if (mode !== "search") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, mode]);

  // Dedup en vivo del alta rápida: el teléfono manda (la búsqueda del API
  // normaliza dígitos), si no hay suficientes dígitos se busca por nombre.
  useEffect(() => {
    if (mode !== "create") return;
    let cancelled = false; // stale-guard: respuestas fuera de orden no pisan
    const term = looksLikePhone(phone) ? phone.trim() : name.trim();
    const id = setTimeout(() => {
      if (term.length < 3) {
        if (!cancelled) setDupes([]);
        return;
      }
      clientsApi
        .list({ search: term, isActive: true, take: 5 })
        .then((res) => {
          if (!cancelled) setDupes(res.items);
        })
        .catch(() => {
          if (!cancelled) setDupes([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [mode, name, phone]);

  /** Pasa a alta rápida prellenando con lo ya tecleado en la búsqueda. */
  const startCreate = () => {
    setCreateError(null);
    setDupes([]);
    if (looksLikePhone(debounced)) {
      setPhone(debounced);
      setName("");
    } else {
      setName(debounced);
      setPhone("");
    }
    setMode("create");
  };

  const canSubmit =
    name.trim().length > 0 && phone.trim().length > 0 && !creating;

  const create = async () => {
    if (!canSubmit) return;
    setCreating(true);
    setCreateError(null);
    try {
      const input = {
        name: name.trim(),
        type,
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      const { id } = await clientsApi.create(input);
      // El POST devuelve solo {id}: se construye el cliente local con lo
      // capturado (suficiente para el POS/cotizador; el detalle completo
      // vive en /clients).
      const now = new Date().toISOString();
      onSelect({
        id,
        name: input.name,
        type,
        contact: null,
        phone: input.phone,
        email: email.trim() || null,
        rfc: null,
        taxRegimen: null,
        fiscalName: null,
        usoCFDI: null,
        postalCode: null,
        notes: null,
        tags: [],
        additionalPhones: [],
        additionalEmails: [],
        isActive: true,
        addresses: [],
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      setCreating(false);
      setCreateError(
        err instanceof ApiError ? err.message : "No se pudo crear el cliente.",
      );
    }
  };

  return (
    <Modal
      title={mode === "search" ? "Seleccionar cliente" : "Nuevo cliente"}
      onClose={onClose}
      width={520}
      footer={
        mode === "search" ? (
          canCreate ? (
            <button className="btn" type="button" onClick={startCreate}>
              {I.plus} Nuevo cliente
            </button>
          ) : undefined
        ) : (
          <>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setMode("search")}
              disabled={creating}
            >
              ← Volver a buscar
            </button>
            <button
              className="btn btn--accent"
              type="button"
              onClick={() => void create()}
              disabled={!canSubmit}
            >
              {creating ? "Creando…" : "Crear y usar"}
            </button>
          </>
        )
      }
    >
      {mode === "search" ? (
        <div className="flex flex-col gap-3">
          <div className="topbar__search m-0 w-full" style={{ maxWidth: "none" }}>
            {I.search}
            <input
              placeholder="Buscar por nombre, teléfono, RFC…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {loadError && (
            <div
              className="flex items-start gap-2 rounded-md"
              style={{
                padding: 12,
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                background: "var(--danger-soft)",
              }}
              role="alert"
            >
              <span className="flex-1">{loadError}</span>
            </div>
          )}

          <div
            className="border border-line rounded-md overflow-y-auto"
            style={{ maxHeight: 360 }}
          >
            {loading ? (
              <div className="empty m-4">Cargando…</div>
            ) : clients.length === 0 ? (
              <div className="empty m-4 flex flex-col items-center gap-2">
                <span>
                  {debounced
                    ? "Sin resultados para la búsqueda."
                    : "No hay clientes activos."}
                </span>
                {debounced && canCreate && (
                  <button className="btn btn--sm" type="button" onClick={startCreate}>
                    {I.plus} Crear cliente «{debounced}»
                  </button>
                )}
              </div>
            ) : (
              clients.map((c, idx) => (
                <ClientRow key={c.id} client={c} onSelect={onSelect} first={idx === 0} />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-muted text-xs">
            Solo nombre y teléfono son obligatorios — lo demás se puede
            completar después en Clientes.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <span className="label">Nombre *</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={creating}
              />
            </div>
            <div className="field">
              <span className="label">Teléfono *</span>
              <input
                className="input"
                inputMode="tel"
                placeholder="10 dígitos"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={creating}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <span className="label">Tipo</span>
              <div className="flex gap-2">
                {(
                  [
                    ["individual", "Persona"],
                    ["business", "Negocio"],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn--sm ${type === t ? "btn--primary" : "btn--ghost"}`}
                    onClick={() => setType(t)}
                    disabled={creating}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Correo (opcional)</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={creating}
              />
            </div>
          </div>

          {dupes.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--accent-ink)" }}>
                ¿Ya existe? Tócalo para usarlo:
              </div>
              <div className="border border-line rounded-md overflow-y-auto" style={{ maxHeight: 180 }}>
                {dupes.map((c, idx) => (
                  <ClientRow key={c.id} client={c} onSelect={onSelect} first={idx === 0} />
                ))}
              </div>
            </div>
          )}

          {createError && (
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
              {createError}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
