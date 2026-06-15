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
let queue: Promise<unknown> = Promise.resolve();

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(1, 1, 1);
  scene.add(dir);

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
