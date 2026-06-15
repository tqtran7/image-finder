import * as THREE from "three";
import { loadFbx, cloneModel } from "@/lib/three/modelCache";
import { frameObject } from "@/lib/three/frameObject";

/**
 * A single shared WebGL renderer that turns FBX files into cached PNG snapshots
 * for the mesh grid. One renderer (one WebGL context) serves every card; renders
 * are serialized through a queue and results are cached by image id, so scrolling
 * back to a card is instant and never re-renders.
 */

const SIZE = 256;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;

const cache = new Map<number, string>();
const angleCache = new Map<string, string[]>();
let queue: Promise<unknown> = Promise.resolve();

const UP = new THREE.Vector3(0, 1, 0);
// Base 3/4 view direction — matches frameObject's default offset.
const BASE_DIR = new THREE.Vector3(0.6, 0.4, 1).normalize();

/**
 * Camera directions (unit vectors from the object's center) for `count` views. The
 * single view reuses the base 3/4 angle; 2 and 4 orbit around the vertical axis; 6
 * adds a raised and a lowered view for top/bottom coverage. Falls back to the base
 * direction for unexpected counts.
 */
function viewDirections(count: number): THREE.Vector3[] {
  const orbit = (azimuths: number[]) =>
    azimuths.map((deg) =>
      BASE_DIR.clone().applyAxisAngle(UP, (deg * Math.PI) / 180),
    );

  switch (count) {
    case 2:
      return orbit([0, 180]);
    case 4:
      return orbit([0, 90, 180, 270]);
    case 6:
      return [
        ...orbit([0, 90, 180, 270]),
        new THREE.Vector3(0.6, 1.2, 1).normalize(), // raised, looking down
        new THREE.Vector3(0.6, -0.6, 1).normalize(), // lowered, looking up
      ];
    default:
      return [BASE_DIR.clone()];
  }
}

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x3f3f46, 1); // zinc-700 — slightly lighter studio background

  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 5.0));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(1, 1, 1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688cc, 1.5); // cool blue fill from opposite side
  fill.position.set(-1, 0.5, -1);
  scene.add(fill);

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
}

async function render(id: number, url: string): Promise<string> {
  const cached = cache.get(id);
  if (cached) return cached;

  ensureRenderer();
  const master = await loadFbx(url);
  const model = cloneModel(master);
  scene!.add(model);
  try {
    frameObject(camera!, model);
    renderer!.render(scene!, camera!);
    const dataUrl = renderer!.domElement.toDataURL("image/png");
    cache.set(id, dataUrl);
    return dataUrl;
  } finally {
    scene!.remove(model);
  }
}

/**
 * Renders a snapshot for one mesh, serialized behind any in-flight render so the
 * shared renderer is only ever drawing one model at a time. Cached by id.
 */
export function renderThumbnail(id: number, url: string): Promise<string> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  const next = queue.then(() => render(id, url));
  // Keep the chain alive even if this render rejects.
  queue = next.catch(() => undefined);
  return next;
}

/** Renders `count` orbiting views of one mesh into PNG data URLs. */
async function renderAngles(
  id: number,
  url: string,
  count: number,
): Promise<string[]> {
  const key = `${id}:${count}`;
  const cached = angleCache.get(key);
  if (cached) return cached;

  ensureRenderer();
  const master = await loadFbx(url);
  const model = cloneModel(master);
  scene!.add(model);
  try {
    // Frame once to get the center + distance, then move the camera to each angle.
    const { center, distance } = frameObject(camera!, model);
    const urls = viewDirections(count).map((dir) => {
      camera!.position.copy(center).addScaledVector(dir, distance);
      camera!.lookAt(center);
      renderer!.render(scene!, camera!);
      return renderer!.domElement.toDataURL("image/png");
    });
    angleCache.set(key, urls);
    return urls;
  } finally {
    scene!.remove(model);
  }
}

/**
 * Renders `count` views (1/2/4/6) of one mesh, serialized behind any in-flight render.
 * Cached by id + count. Used to feed several angles to the auto-tagger at once.
 */
export function renderThumbnailAngles(
  id: number,
  url: string,
  count: number,
): Promise<string[]> {
  const cached = angleCache.get(`${id}:${count}`);
  if (cached) return Promise.resolve(cached);
  const next = queue.then(() => renderAngles(id, url, count));
  queue = next.catch(() => undefined);
  return next;
}
