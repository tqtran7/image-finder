import * as THREE from "three";

export interface Framing {
  center: THREE.Vector3;
  distance: number;
  radius: number;
}

/**
 * Positions `camera` so `object` fills the frame, looking at its bounding-sphere
 * center from a pleasant 3/4 angle. Returns the framing so callers (e.g. orbit
 * controls) can reuse the center as a target. Pure aside from mutating `camera`.
 */
export function frameObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  padding = 1.3,
): Framing {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const radius = sphere.radius || 1;

  const fov = (camera.fov * Math.PI) / 180;
  const distance = (radius / Math.sin(fov / 2)) * padding;

  // 3/4 view: offset up and to the side for a readable silhouette.
  const dir = new THREE.Vector3(0.6, 0.4, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(distance - radius * 2, 0.01);
  camera.far = distance + radius * 4;
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  return { center, distance, radius };
}
