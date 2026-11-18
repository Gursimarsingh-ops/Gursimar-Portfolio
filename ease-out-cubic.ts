import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Object3D } from "three";
import type { RobotVariant } from "../robots/robotConfig";
import { useGripPose, applyGripPose } from "./useGripPose";

export interface RobotAnimationOptions {
  variant: RobotVariant;
  /** Seconds before the fly-in starts. Staggered per robot. */
  delay?: number;
}

export interface RobotAnimationRefs {
  rootRef: React.RefObject<Group | null>;
  bodyRef: React.RefObject<Group | null>;
}

const ENTRANCE_DURATION = 2.2;
const ENTRANCE_DISTANCE = 9;

/** Cubic ease-out: fast approach, gradual deceleration. */
function easeOutCubic(t: number): number {
  const c = 1 - t;
  return 1 - c * c * c;
}

/**
 * Drives one robot: one-shot fly-in, continuous hover, subtle pitch/roll,
 * torso sway, and a stable grip applied once the entrance completes.
 * All math is scalar; no per-frame allocation.
 */
export function useRobotAnimation({
  variant,
  delay = 0,
}: RobotAnimationOptions): RobotAnimationRefs {
  const rootRef = useRef<Group | null>(null);
  const bodyRef = useRef<Group | null>(null);
  const elapsed = useRef(0);
  const gripApplied = useRef(false);

  const leftPose = useGripPose({ variant, side: "left" });
  const rightPose = useGripPose({ variant, side: "right" });

  const phase = useMemo(() => variant.hoverPhase, [variant.hoverPhase]);
  const targetY = variant.rootY;
  const targetZ = variant.rootZ;

  useFrame((_, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    elapsed.current += delta;
    const t = elapsed.current - delay;

    if (t <= 0) {
      root.position.set(variant.rootX, targetY - ENTRANCE_DISTANCE, targetZ - ENTRANCE_DISTANCE);
      root.visible = false;
      return;
    }

    root.visible = true;

    if (t < ENTRANCE_DURATION) {
      const k = easeOutCubic(t / ENTRANCE_DURATION);
      root.position.set(
        variant.rootX,
        targetY - ENTRANCE_DISTANCE * (1 - k),
        targetZ - ENTRANCE_DISTANCE * (1 - k)
      );
      root.rotation.x = (1 - k) * -0.35;
      root.rotation.z = (1 - k) * 0.2;
    } else {
      const h = t - ENTRANCE_DURATION;
      const bob = Math.sin(h * 1.1 + phase) * 0.06;
      const sway = Math.sin(h * 0.7 + phase * 1.3) * 0.03;
      root.position.set(variant.rootX + sway, targetY + bob, targetZ);
      root.rotation.x = Math.sin(h * 0.9 + phase) * 0.02;
      root.rotation.z = Math.sin(h * 0.6 + phase * 0.8) * 0.025;
    }

    body.rotation.y = Math.sin(t * 0.5 + phase) * 0.04;

    if (!gripApplied.current && t >= ENTRANCE_DURATION) {
      applyGripToHands(root, variant, leftPose, rightPose);
      gripApplied.current = true;
    }
  });

  return { rootRef, bodyRef };
}

function applyGripToHands(
  root: Object3D,
  variant: RobotVariant,
  leftPose: ReturnType<typeof useGripPose>,
  rightPose: ReturnType<typeof useGripPose>
): void {
  const left = root.getObjectByName("hand-root-left");
  const right = root.getObjectByName("hand-root-right");
  if (left) applyGripPose(left, leftPose, "left");
  if (right) applyGripPose(right, rightPose, "right");
  void variant;
}