import { useMemo } from "react";
import type { Object3D } from "three";
import type { RobotVariant } from "../robots/robotConfig";
import { FRAME } from "../config/sceneConfig";

export interface GripPoseOptions {
  variant: RobotVariant;
  side: "left" | "right";
}

export interface GripPose {
  /** Radians per segment, ordered proximal -> distal, per finger. */
  fingerCurl: number[];
  /** Thumb base yaw, then proximal -> distal curl. */
  thumbYaw: number;
  thumbCurl: number[];
  /** Wrist roll that turns the palm toward the frame edge. */
  wristRoll: number;
}

const FINGER_IDS = ["index", "middle", "ring", "pinky", "pinky2"] as const;

/**
 * Computes a static grip pose for one hand around one frame edge.
 * Pure data — no scene access. The animation hook applies it.
 */
export function useGripPose({ variant, side }: GripPoseOptions): GripPose {
  return useMemo<GripPose>(() => {
    const edge = FRAME.width / 2 + FRAME.border * 0.5;
    const reach = edge - Math.abs(variant.rootX);
    const tightness = Math.max(0.35, Math.min(1, 1 - reach / 4));

    const base = 0.9 + tightness * 0.5;
    const fingerCurl = [
      base * 0.85,
      base * 1.05,
      base * 1.15,
    ];

    const thumbBase = 0.55 + tightness * 0.35;
    const thumbCurl = [
      thumbBase * 0.9,
      thumbBase * 1.1,
      thumbBase * 1.2,
    ];

    const wristRoll = side === "left" ? -0.35 : 0.35;

    return {
      fingerCurl,
      thumbYaw: side === "left" ? 0.9 : -0.9,
      thumbCurl,
      wristRoll,
    };
  }, [variant, side]);
}

export const GRIP_FINGER_IDS = FINGER_IDS;

/**
 * Applies a grip pose to a hand group found by name.
 * Missing joints are skipped, never thrown on.
 */
export function applyGripPose(
  hand: Object3D,
  pose: GripPose,
  side: "left" | "right"
): void {
  for (const id of FINGER_IDS) {
    const seg1 = hand.getObjectByName(`finger-${id}-${side}-seg1`);
    const joint2 = hand.getObjectByName(`finger-${id}-${side}-joint2`);
    const joint3 = hand.getObjectByName(`finger-${id}-${side}-joint3`);
    if (seg1) seg1.rotation.x = pose.fingerCurl[0];
    if (joint2) joint2.rotation.x = pose.fingerCurl[1];
    if (joint3) joint3.rotation.x = pose.fingerCurl[2];
  }

  const thumbBase = hand.getObjectByName(`thumb-${side}-base`);
  const thumbSeg1 = hand.getObjectByName(`thumb-${side}-seg1`);
  const thumbJoint2 = hand.getObjectByName(`thumb-${side}-joint2`);
  const thumbJoint3 = hand.getObjectByName(`thumb-${side}-joint3`);

  if (thumbBase) thumbBase.rotation.z = pose.thumbYaw;
  if (thumbSeg1) thumbSeg1.rotation.x = pose.thumbCurl[0];
  if (thumbJoint2) thumbJoint2.rotation.x = pose.thumbCurl[1];
  if (thumbJoint3) thumbJoint3.rotation.x = pose.thumbCurl[2];
}