import type { Metadata } from "next";
import PageContent from "@/components/PageContent";
import { loadSection } from "@/lib/section";

export const metadata: Metadata = {
  title: "Icon Finder",
  description: "Tag and search your local icon library",
};

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  const data = loadSection("image", params);

  return <PageContent {...data} kind="image" basePath="/images" />;
}
