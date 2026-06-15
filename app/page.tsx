import { redirect } from "next/navigation";

/** A folder (root) with its indexed/tagged file counts, shared by both sections. */
export interface RootWithCount {
  id: number;
  path: string;
  label: string;
  added_at: number | null;
  last_scanned_at: number | null;
  image_count: number;
  tagged_count: number;
}

export default function RootPage() {
  redirect("/images");
}
