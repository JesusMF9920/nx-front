"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { I } from "@/components/icons";
import { SkeletonText } from "@/components/skeleton";
import { useTheme } from "@/lib/theme/theme-context";
import type { ThemePreference } from "@/lib/theme/theme";
import { ApiError } from "@/lib/api/errors";
import {
  isLogoContentType,
  LOGO_ACCEPT,
  settingsApi,
} from "@/lib/api/settings";
import { storageApi } from "@/lib/api/storage";
import type { ApiBusinessSettings, ApiFeatureFlag } from "@/lib/api/types";
import { useAuth, usePermission } from "@/lib/auth/auth-context";
import {
  CLAVE_UNIDAD,
  OBJETO_IMPUESTO,
  REGIMEN_FISCAL,
} from "@/lib/sat-catalogs";
import { useToast } from "@/lib/toast/toast-context";

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Algo salió mal.";
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] =
  [
    { value: "light", label: "Claro", icon: I.sun },
    { value: "dark", label: "Oscuro", icon: I.moon },
    { value: "system", label: "Sistema", icon: I.monitor },
  ];

/**
 * Preferencia de tema. Es client-only (no pasa por la API ni por
 * `settings.manage`), así que la ve cualquier usuario autenticado.
 */
function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 className="text-sm font-semibold mb-1">Apariencia</h2>
      <p className="text-muted text-xs mb-4">
        Tema de la interfaz. «Sistema» sigue la preferencia de tu dispositivo. Se
        guarda solo en este navegador.
      </p>
      <div role="radiogroup" aria-label="Tema" className="flex gap-2">
        {THEME_OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(opt.value)}
              className="btn flex-1"
              style={{
                height: 56,
                flexDirection: "column",
                gap: 4,
                justifyContent: "center",
                background: active ? "var(--accent-soft)" : "var(--surface)",
                borderColor: active ? "var(--accent)" : "var(--line)",
                color: active ? "var(--accent-ink)" : "var(--ink)",
                fontWeight: active ? 600 : 500,
              }}
            >
              <span className="inline-flex">{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const canManage = usePermission("settings.manage");
  const { refresh } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<ApiBusinessSettings | null>(null);
  const [flags, setFlags] = useState<ApiFeatureFlag[]>([]);

  // Form de datos del negocio (string vacío en UI ↔ null en API).
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [rfc, setRfc] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Datos fiscales (CFDI): emisor + defaults de conceptos.
  const [taxRegimen, setTaxRegimen] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [defClaveProdServ, setDefClaveProdServ] = useState("");
  const [defClaveUnidad, setDefClaveUnidad] = useState("");
  const [defObjetoImpuesto, setDefObjetoImpuesto] = useState("");
  const [fiscalSaving, setFiscalSaving] = useState(false);
  const [fiscalSaved, setFiscalSaved] = useState(false);
  const [fiscalError, setFiscalError] = useState<string | null>(null);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [flagsError, setFlagsError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      try {
        const [biz, feats] = await Promise.all([
          settingsApi.getBusiness(),
          settingsApi.listFeatures(),
        ]);
        if (cancelled) return;
        setBusiness(biz);
        setFlags(feats.items);
        setName(biz.name);
        setAddress(biz.address ?? "");
        setPhone(biz.phone ?? "");
        setRfc(biz.rfc ?? "");
        setEmail(biz.email ?? "");
        setTaxRegimen(biz.taxRegimen ?? "");
        setPostalCode(biz.postalCode ?? "");
        setDefClaveProdServ(biz.defaultClaveProdServ ?? "");
        setDefClaveUnidad(biz.defaultClaveUnidad ?? "");
        setDefObjetoImpuesto(biz.defaultObjetoImpuesto ?? "");
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errMsg(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (!canManage) {
    return (
      <>
        <PageHeader title="Configuración" sub="Datos del negocio y funciones" />
        <div className="grid gap-4" style={{ maxWidth: 720 }}>
          <AppearanceCard />
          <div className="card" style={{ padding: 16 }}>
            <div className="text-muted text-sm">
              No tienes permiso para editar la configuración ({" "}
              <span className="font-mono text-[11px]">settings.manage</span> ).
              Pídele a un administrador que te lo asigne.
            </div>
          </div>
        </div>
      </>
    );
  }

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setFormError(null);
    const norm = (v: string) => {
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    try {
      const updated = await settingsApi.updateBusiness({
        name: name.trim(),
        address: norm(address),
        phone: norm(phone),
        rfc: norm(rfc),
        email: norm(email),
      });
      setBusiness(updated);
      setSaved(true);
      toast.success("Datos del negocio guardados");
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveFiscal(e: React.FormEvent) {
    e.preventDefault();
    if (fiscalSaving) return;
    setFiscalSaving(true);
    setFiscalSaved(false);
    setFiscalError(null);
    const norm = (v: string) => {
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    try {
      const updated = await settingsApi.updateBusiness({
        taxRegimen: norm(taxRegimen),
        postalCode: norm(postalCode),
        defaultClaveProdServ: norm(defClaveProdServ),
        defaultClaveUnidad: norm(defClaveUnidad),
        defaultObjetoImpuesto: norm(defObjetoImpuesto),
      });
      setBusiness(updated);
      setFiscalSaved(true);
      toast.success("Datos fiscales guardados");
    } catch (err) {
      setFiscalError(errMsg(err));
    } finally {
      setFiscalSaving(false);
    }
  }

  async function uploadLogo(file: File | null) {
    if (!file || logoBusy) return;
    setLogoError(null);
    if (!isLogoContentType(file.type)) {
      setLogoError("Tipo no permitido para el logo. Usa PNG o JPG.");
      return;
    }
    setLogoBusy(true);
    try {
      const { key, uploadUrl } = await settingsApi.presignLogoUpload(file.type);
      // El PUT directo a Spaces es el mismo que el de los diseños.
      await storageApi.upload(uploadUrl, file);
      const updated = await settingsApi.updateBusiness({ logoKey: key });
      setBusiness(updated);
      toast.success("Logo actualizado");
    } catch (err) {
      setLogoError(errMsg(err));
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (logoBusy) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      const updated = await settingsApi.updateBusiness({ logoKey: null });
      setBusiness(updated);
      toast.success("Logo eliminado");
    } catch (err) {
      setLogoError(errMsg(err));
    } finally {
      setLogoBusy(false);
    }
  }

  async function toggleFlag(flag: ApiFeatureFlag) {
    if (togglingKey) return;
    setTogglingKey(flag.key);
    setFlagsError(null);
    try {
      const res = await settingsApi.setFeature(flag.key, !flag.enabled);
      setFlags((prev) =>
        prev.map((f) =>
          f.key === res.key ? { ...f, enabled: res.enabled } : f,
        ),
      );
      toast.success(
        res.enabled
          ? `Función «${flag.label}» activada`
          : `Función «${flag.label}» desactivada`,
      );
      // Propagar a useFeature en toda la app (checkboxes del POS, botones…).
      await refresh();
    } catch (err) {
      setFlagsError(errMsg(err));
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <>
      <PageHeader title="Configuración" sub="Datos del negocio y funciones" />

      {error && (
        <div className="card mb-3" style={{ padding: 16 }}>
          <div className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ maxWidth: 720 }}>
        {/* ── Apariencia (tema, client-only) ────────────────────────── */}
        <AppearanceCard />

        {/* ── Datos del negocio ─────────────────────────────────────── */}
        <div className="card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold mb-1">Datos del negocio</h2>
          <p className="text-muted text-xs mb-4">
            Aparecen en los tickets y PDFs que ve el cliente (térmico, ticket
            carta y cotizaciones).
          </p>

          <form onSubmit={saveBusiness} className="grid" style={{ gap: 14 }}>
            <div className="field">
              <span className="label">Nombre del negocio</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || saving}
                required
              />
            </div>
            <div className="field">
              <span className="label">Dirección</span>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading || saving}
                placeholder="Calle, número, colonia, ciudad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <span className="label">Teléfono</span>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div className="field">
                <span className="label">RFC</span>
                <input
                  className="input"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value)}
                  disabled={loading || saving}
                />
              </div>
            </div>
            <div className="field">
              <span className="label">Correo</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || saving}
              />
            </div>

            {formError && (
              <div className="text-xs" style={{ color: "var(--danger)" }}>
                {formError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                className="btn btn--accent"
                type="submit"
                disabled={loading || saving || name.trim().length === 0}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              {saved && (
                <span className="text-xs" style={{ color: "var(--ok)" }}>
                  Guardado ✓
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ── Datos fiscales (CFDI) ─────────────────────────────────── */}
        <div className="card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold mb-1">Datos fiscales (CFDI)</h2>
          <p className="text-muted text-xs mb-4">
            Necesarios para emitir facturas (CFDI 4.0). El régimen y el código
            postal son los del emisor; las claves SAT son el default de los
            conceptos cuando un producto no define las suyas.
          </p>

          <form onSubmit={saveFiscal} className="grid" style={{ gap: 14 }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <span className="label">Régimen fiscal</span>
                <select
                  className="input"
                  value={taxRegimen}
                  onChange={(e) => setTaxRegimen(e.target.value)}
                  disabled={loading || fiscalSaving}
                >
                  <option value="">— Selecciona —</option>
                  {REGIMEN_FISCAL.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="label">Código postal (lugar de expedición)</span>
                <input
                  className="input"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={loading || fiscalSaving}
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="00000"
                />
              </div>
            </div>

            <div className="text-muted text-xs -mb-1 mt-1">
              Defaults de conceptos (override por producto)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="field">
                <span className="label">ClaveProdServ</span>
                <input
                  className="input"
                  value={defClaveProdServ}
                  onChange={(e) => setDefClaveProdServ(e.target.value)}
                  disabled={loading || fiscalSaving}
                  maxLength={8}
                  placeholder="82121500"
                />
              </div>
              <div className="field">
                <span className="label">ClaveUnidad</span>
                <select
                  className="input"
                  value={defClaveUnidad}
                  onChange={(e) => setDefClaveUnidad(e.target.value)}
                  disabled={loading || fiscalSaving}
                >
                  <option value="">— Selecciona —</option>
                  {CLAVE_UNIDAD.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="label">Objeto de impuesto</span>
                <select
                  className="input"
                  value={defObjetoImpuesto}
                  onChange={(e) => setDefObjetoImpuesto(e.target.value)}
                  disabled={loading || fiscalSaving}
                >
                  <option value="">— Selecciona —</option>
                  {OBJETO_IMPUESTO.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {fiscalError && (
              <div className="text-xs" style={{ color: "var(--danger)" }}>
                {fiscalError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                className="btn btn--accent"
                type="submit"
                disabled={loading || fiscalSaving}
              >
                {fiscalSaving ? "Guardando…" : "Guardar datos fiscales"}
              </button>
              {fiscalSaved && (
                <span className="text-xs" style={{ color: "var(--ok)" }}>
                  Guardado ✓
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold mb-1">Logo</h2>
          <p className="text-muted text-xs mb-4">
            PNG o JPG. Se imprime en el ticket carta y en el ticket térmico.
          </p>

          {business?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada remota con query de firma; next/image no aplica
            <img
              src={business.logoUrl}
              alt="Logo del negocio"
              style={{
                maxWidth: 220,
                maxHeight: 90,
                borderRadius: 8,
                border: "1px solid var(--line)",
                marginBottom: 12,
              }}
            />
          ) : (
            <div className="text-muted text-xs mb-3">Sin logo configurado.</div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={LOGO_ACCEPT}
            hidden
            onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-2">
            <button
              className="btn"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || logoBusy}
            >
              {logoBusy ? "Subiendo…" : "Subir logo…"}
            </button>
            {business?.logoKey && (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => void removeLogo()}
                disabled={loading || logoBusy}
              >
                Quitar logo
              </button>
            )}
          </div>
          {logoError && (
            <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>
              {logoError}
            </div>
          )}
        </div>

        {/* ── Funciones (feature flags) ─────────────────────────────── */}
        <div className="card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold mb-1">Funciones</h2>
          <p className="text-muted text-xs mb-4">
            Activa o desactiva funciones del sistema. Los cambios aplican de
            inmediato para todos los usuarios.
          </p>

          {loading && <SkeletonText lines={4} />}
          {!loading && flags.length === 0 && (
            <div className="text-muted text-sm">
              No hay funciones configurables.
            </div>
          )}

          {flags.map((flag) => (
            <label
              key={flag.key}
              className="flex items-start gap-3 py-2"
              style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={flag.enabled}
                disabled={togglingKey !== null}
                onChange={() => void toggleFlag(flag)}
                style={{ marginTop: 3 }}
              />
              <span>
                <span className="text-[13px] font-medium block">
                  {flag.label}
                  {togglingKey === flag.key && (
                    <span className="text-muted text-xs"> · guardando…</span>
                  )}
                </span>
                <span className="text-muted text-xs">{flag.description}</span>
              </span>
            </label>
          ))}

          {flagsError && (
            <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>
              {flagsError}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
