"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { clientsApi } from "@/lib/api/clients";
import { ApiError } from "@/lib/api/errors";
import type { ApiClient } from "@/lib/api/types";

type Props = {
  onClose: () => void;
  onSelect: (client: ApiClient) => void;
};

export function PosClientPicker({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <Modal title="Seleccionar cliente" onClose={onClose} width={520}>
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
            <div className="empty m-4">
              {debounced ? "Sin resultados para la búsqueda." : "No hay clientes activos."}
            </div>
          ) : (
            clients.map((c, idx) => (
              <button
                type="button"
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer bg-transparent"
                style={{ borderTop: idx === 0 ? 0 : "1px solid var(--line)" }}
              >
                <Avatar name={c.name} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px]">{c.name}</div>
                  <div className="text-muted text-[11px]">
                    {[c.phone, c.rfc, c.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </div>
                </div>
                <span className="tag text-[10px]">
                  {c.type === "business" ? "Negocio" : "Persona física"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
