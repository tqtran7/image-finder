import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Client-side cache and helpers for loaded FBX models. The master parsed group
 * for a URL is loaded once and memoized; viewers take disposable clones so the
 * same model can appear in several scenes (grid hover, details panel) at once.
 */

const loadPromises = new Map<string, Promise<THREE.Group>>();
let loader: FBXLoader | null = null;

function getLoader(): FBXLoader {
  if (!loader) loader = new FBXLoader();
  return loader;
}

const FALLBACK_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x9ca3af, // zinc-400, matches the placeholder tint
  metalness: 0.1,
  roughness: 0.75,
});

/** Loads and memoizes the master FBX group for a URL. */
export function loadFbx(url: string): Promise<THREE.Group> {
  let p = loadPromises.get(url);
  if (!p) {
    p = getLoader().loadAsync(url).catch((err) => {
      // Drop the rejected promise so a later attempt can retry.
      loadPromises.delete(url);
      throw err;
    });
    loadPromises.set(url, p);
  }
  return p;
}

/**
 * Returns a display clone of `master`, safe to add to its own scene. Meshes that
 * loaded without a material get a neutral fallback so they're never invisible.
 */
export function cloneModel(master: THREE.Group): THREE.Object3D {
  const copy = skeletonClone(master);
  copy.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const hasMaterial = Array.isArray(child.material)
        ? child.material.length > 0
        : !!child.material;
      if (!hasMaterial) child.material = FALLBACK_MATERIAL;
    }
  });
  return copy;
}
