import { ComingSoon } from "@/components/coming-soon";

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <ComingSoon slug={slug[0]} />;
}
