import { labelForRoute } from "@/lib/routes";
import { PageHeader } from "./page-header";

export function ComingSoon({ slug }: { slug: string }) {
  return (
    <>
      <PageHeader title={labelForRoute(slug)} sub="Módulo en construcción" />
      <div className="empty">
        <div style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500, marginBottom: 6 }}>
          Próximamente
        </div>
        Este módulo se entregará en una iteración posterior.
      </div>
    </>
  );
}
