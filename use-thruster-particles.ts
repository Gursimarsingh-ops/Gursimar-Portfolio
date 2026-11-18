import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";
import type { RobotVariant } from "./src/components/robot-scene/robots/robotConfig";

export interface ThrusterParticleOptions {
  variant: RobotVariant;
  count?: number;
}

export interface ThrusterParticleHandles {
  pointsRef: React.RefObject<Points | null>;
  /** 0..1, driven by hover phase. */
  intensityRef: React.RefObject<number>;
}

const DEFAULT_COUNT = 220;
const LIFETIME = 0.9;
const SPEED = 2.4;

/**
 * Procedural downward thruster particles. One BufferGeometry, mutated in place.
 * No allocation inside useFrame.
 */
export function useThrusterParticles({
  variant,
  count = DEFAULT_COUNT,
}: ThrusterParticleOptions): ThrusterParticleHandles {
  const pointsRef = useRef<Points>(null!);
  const intensityRef = useRef(1);

  const buffers = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const ages = new Float32Array(count);
    const speeds = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      ages[i] = Math.random() * LIFETIME;
      speeds[i] = SPEED * (0.6 + Math.random() * 0.8);
      seeds[i] = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    return { positions, ages, speeds, seeds, count };
  }, [count]);

  const phase = useMemo(() => variant.hoverPhase, [variant.hoverPhase]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const geo = points.geometry;
    const attr = geo.getAttribute("position") as { array: Float32Array; needsUpdate: boolean };
    const arr = attr.array;
    const { ages, speeds, seeds } = buffers;

    const intensity = 0.6 + Math.sin(performance.now() * 0.001 + phase) * 0.4;
    intensityRef.current = intensity;

    for (let i = 0; i < buffers.count; i++) {
      ages[i] += delta;
      if (ages[i] > LIFETIME) {
        ages[i] -= LIFETIME;
        arr[i * 3 + 0] = Math.sin(seeds[i]) * 0.04;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = Math.cos(seeds[i]) * 0.04;
      } else {
        arr[i * 3 + 1] -= speeds[i] * delta * intensity;
        arr[i * 3 + 0] += Math.sin(seeds[i] + ages[i] * 3) * delta * 0.15;
        arr[i * 3 + 2] += Math.cos(seeds[i] + ages[i] * 3) * delta * 0.15;
      }
    }

    attr.needsUpdate = true;
  });

  return { pointsRef, intensityRef };
}