import type { Metadata } from "next";
import PageContent from "@/components/PageContent";
import { loadSection } from "@/lib/section";

export const metadata: Metadata = {
  title: "Mesh Finder",
  description: "Tag and search your local 3D mesh library",
};

export default async function MeshesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  const data = loadSection("mesh", params);

  return <PageContent {...data} kind="mesh" basePath="/meshes" />;
}
