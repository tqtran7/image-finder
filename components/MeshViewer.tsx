"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadFbx, cloneModel } from "@/lib/three/modelCache";
import { frameObject } from "@/lib/three/frameObject";

interface MeshViewerProps {
  url: string;
  /** Spin the model automatically. */
  autoRotate?: boolean;
  /** Enable OrbitControls (drag to rotate, scroll to zoom). */
  interactive?: boolean;
  className?: string;
}

/**
 * Interactive FBX canvas with its own WebGL renderer. Used for the grid hover
 * preview and the details-panel viewer. Sizes to its container and tears down
 * the renderer/controls and RAF loop on unmount, so at most one or two of these
 * are ever live at a time.
 */
export default function MeshViewer({
  url,
  autoRotate = false,
  interactive = false,
  className,
}: MeshViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(1, 1, 1);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);

    let controls: OrbitControls | null = null;
    let model: THREE.Object3D | null = null;

    function size() {
      const w = mount!.clientWidth || 1;
      const h = mount!.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(size);
    ro.observe(mount);
    mount.appendChild(renderer.domElement);
    size();

    loadFbx(url)
      .then((master) => {
        if (disposed) return;
        model = cloneModel(master);
        scene.add(model);
        const { center } = frameObject(camera, model);

        if (interactive) {
          controls = new OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.enablePan = false;
          controls.target.copy(center);
          controls.autoRotate = autoRotate;
          controls.autoRotateSpeed = 2;
          controls.update();
        }
        setLoading(false);

        const tick = () => {
          if (disposed) return;
          raf = requestAnimationFrame(tick);
          if (controls) {
            controls.update();
          } else if (autoRotate && model) {
            model.rotateY(0.03);
          }
          renderer.render(scene, camera);
        };
        tick();
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls?.dispose();
      if (model) scene.remove(model);
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, [url, autoRotate, interactive]);

  return (
    <div ref={mountRef} className={`relative h-full w-full ${className ?? ""}`}>
      {(loading || failed) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CubeIcon />
        </div>
      )}
    </div>
  );
}

function CubeIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-400 dark:text-zinc-500"
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
