import Link from "next/link";
import { notFound } from "next/navigation";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProductDetail } from "@/components/product-detail";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";

export function generateStaticParams() {
  return NEXUM_PRODUCTS.map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = NEXUM_PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        sub={
          <span>
            <Link href="/products" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Productos
            </Link>{" "}
            · {product.sku}
          </span>
        }
        actions={
          <Link href="/products" className="btn">
            <span>{I.arrowLeft}</span>Volver al catálogo
          </Link>
        }
      />
      <ProductDetail product={product} />
    </>
  );
}
