import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";

/**
 * Shared geometry + material factories. Every mesh reuses one of these
 * instances. Nothing is created inside a render loop.
 */

export const KIT = {
  // Torso
  chest: new BoxGeometry(1.15, 1.35, 0.72),
  chestPlate: new BoxGeometry(0.95, 0.55, 0.14),
  abdomen: new BoxGeometry(0.85, 0.4, 0.6),
  pelvis: new BoxGeometry(0.95, 0.42, 0.62),
  backPack: new BoxGeometry(0.72, 0.85, 0.32),

  // Neck + head
  neck: new CylinderGeometry(0.11, 0.13, 0.22, 12),
  head: new BoxGeometry(0.66, 0.54, 0.58),
  headCrown: new BoxGeometry(0.5, 0.12, 0.44),
  visor: new BoxGeometry(0.52, 0.18, 0.06),
  mouthGrille: new BoxGeometry(0.44, 0.15, 0.05),
  earDisc: new CylinderGeometry(0.08, 0.08, 0.04, 14),

  // Antenna
  antennaStem: new CylinderGeometry(0.018, 0.018, 0.36, 8),
  antennaTip: new SphereGeometry(0.05, 14, 14),

  // Shoulders + arms
  shoulderBall: new SphereGeometry(0.21, 18, 18),
  shoulderPad: new BoxGeometry(0.36, 0.24, 0.36),
  upperArm: new CylinderGeometry(0.105, 0.095, 0.64, 14),
  elbow: new SphereGeometry(0.115, 16, 16),
  forearm: new CylinderGeometry(0.095, 0.08, 0.6, 14),
  wrist: new SphereGeometry(0.09, 16, 16),

  // Hand
  palm: new BoxGeometry(0.24, 0.28, 0.11),
  fingerSeg: new BoxGeometry(0.048, 0.115, 0.048),
  thumbSeg: new BoxGeometry(0.055, 0.105, 0.055),

  // Legs
  thigh: new CylinderGeometry(0.135, 0.115, 0.68, 14),
  knee: new SphereGeometry(0.125, 16, 16),
  shin: new CylinderGeometry(0.115, 0.095, 0.64, 14),
  boot: new BoxGeometry(0.26, 0.16, 0.46),
  bootToe: new BoxGeometry(0.24, 0.12, 0.16),

  // Details
  jointRing: new TorusGeometry(0.13, 0.026, 8, 22),
  thrusterHousing: new CylinderGeometry(0.14, 0.17, 0.24, 16),
  thrusterNozzle: new CylinderGeometry(0.11, 0.14, 0.11, 16),
} as const;

export interface RobotMaterials {
  shell: MeshStandardMaterial;
  shellDark: MeshStandardMaterial;
  accent: MeshStandardMaterial;
  accentGlow: MeshStandardMaterial;
  visor: MeshStandardMaterial;
  joint: MeshStandardMaterial;
}

export function createRobotMaterials(accent: string): RobotMaterials {
  return {
    shell: new MeshStandardMaterial({
      color: "#c9ced6",
      metalness: 0.88,
      roughness: 0.3,
    }),
    shellDark: new MeshStandardMaterial({
      color: "#2b2f36",
      metalness: 0.72,
      roughness: 0.48,
    }),
    accent: new MeshStandardMaterial({
      color: accent,
      metalness: 0.62,
      roughness: 0.34,
    }),
    accentGlow: new MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.7,
      metalness: 0.3,
      roughness: 0.4,
    }),
    visor: new MeshStandardMaterial({
      color: "#0a0d12",
      emissive: accent,
      emissiveIntensity: 1.0,
      metalness: 0.9,
      roughness: 0.14,
    }),
    joint: new MeshStandardMaterial({
      color: "#3b4048",
      metalness: 0.95,
      roughness: 0.26,
    }),
  };
}

export const FINGER_IDS = ["index", "middle", "ring", "pinky"] as const;
export type FingerId = (typeof FINGER_IDS)[number];