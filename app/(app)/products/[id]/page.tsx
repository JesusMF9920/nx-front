"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProductDetail } from "@/components/product-detail";
import { catalogApi } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import type { ApiProductDetail } from "@/lib/api/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ApiProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const detail = await catalogApi.get(id);
      setProduct(detail);
      setLoadError(null);
      setMissing(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMissing(true);
        setLoadError(null);
      } else {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el producto.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load();
  }, [id, load]);

  const backLink = (
    <Link href="/products" className="btn">
      <span>{I.arrowLeft}</span>Volver al catálogo
    </Link>
  );
  const breadcrumb = (
    <Link
      href="/products"
      style={{ color: "var(--muted)", textDecoration: "none" }}
    >
      Productos
    </Link>
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Producto" sub={breadcrumb} actions={backLink} />
        <div className="card">
          <div className="card__body text-muted text-sm">
            Cargando producto…
          </div>
        </div>
      </>
    );
  }

  if (missing) {
    return (
      <>
        <PageHeader
          title="Producto no encontrado"
          sub={breadcrumb}
          actions={backLink}
        />
        <div className="card">
          <div className="card__body text-muted text-sm">
            El producto no existe o fue eliminado.
          </div>
        </div>
      </>
    );
  }

  if (loadError || !product) {
    return (
      <>
        <PageHeader title="Producto" sub={breadcrumb} actions={backLink} />
        <div
          className="card flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">
            {loadError ?? "No se pudo cargar el producto."}
          </span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Reintentar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        sub={
          <span>
            {breadcrumb} · <span className="font-mono">{product.sku}</span>
          </span>
        }
        actions={backLink}
      />
      <ProductDetail product={product} onChanged={load} />
    </>
  );
}
