import { renderThumbnailAngles } from "@/lib/three/thumbnailRenderer";
import { autoTagAndAcceptMesh, type AutoTagFilter } from "@/lib/actions";

const PNG_DATA_URL = /^data:image\/png;base64,/;

/**
 * Renders `count` preview snapshots of a mesh (the same three.js views the grid uses)
 * and returns the raw base64 strings, ready to hand to a server-side tagger. Vision
 * models can't read FBX directly, so these browser-rendered images are what we tag.
 */
export async function renderMeshSnapshotsBase64(id: number, count: number): Promise<string[]> {
  const dataUrls = await renderThumbnailAngles(id, `/api/file?id=${id}`, count);
  return dataUrls.map((u) => u.replace(PNG_DATA_URL, ""));
}

/**
 * Batch per-item callback for {@link useAutoTagBatch} when tagging meshes: render the
 * chosen number of snapshots in the browser, then tag-and-accept them server-side.
 */
export async function tagAndAcceptMeshItem(
  id: number,
  filter: AutoTagFilter,
): Promise<{ tagged: boolean; error?: string }> {
  let images: string[];
  try {
    images = await renderMeshSnapshotsBase64(id, filter.meshAngles);
  } catch (err) {
    return { tagged: false, error: `Could not render preview: ${err instanceof Error ? err.message : String(err)}` };
  }
  return autoTagAndAcceptMesh(id, images, filter.invert, filter.addBlackBackground);
}
