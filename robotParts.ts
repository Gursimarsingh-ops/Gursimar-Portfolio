import { BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry } from "three";
import { Color, MeshStandardMaterial } from "three";

export const GEO = {
  torso: new BoxGeometry(0.86, 0.7, 0.6),
  chestPlate: new BoxGeometry(0.7, 0.42, 0.12),
  pelvis: new BoxGeometry(0.6, 0.34, 0.5),
  backPack: new BoxGeometry(0.6, 0.5, 0.16),
  jointRing: new TorusGeometry(0.1, 0.02, 8, 16),
  head: new BoxGeometry(0.92, 0.78, 0.86),
  headVisor: new BoxGeometry(0.78, 0.26, 0.06),
  mouthGrille: new BoxGeometry(0.4, 0.06, 0.04),
  antennaStem: new CylinderGeometry(0.02, 0.02, 0.4, 8),
  antennaTip: new SphereGeometry(0.04, 8, 8),
  shoulder: new SphereGeometry(0.16, 18, 14),
  shoulderPad: new BoxGeometry(0.24, 0.08, 0.28),
  upperArm: new BoxGeometry(0.24, 0.56, 0.24),
  elbow: new SphereGeometry(0.13, 16, 12),
  forearm: new BoxGeometry(0.22, 0.5, 0.22),
  wrist: new TorusGeometry(0.1, 0.025, 10, 20),
  palm: new BoxGeometry(0.78, 0.5, 0.3),
  fingerSeg: new BoxGeometry(0.1, 0.24, 0.12),
  thumbSeg: new BoxGeometry(0.13, 0.22, 0.14),
  thigh: new BoxGeometry(0.26, 0.52, 0.26),
  knee: new SphereGeometry(0.12, 16, 12),
  shin: new BoxGeometry(0.22, 0.5, 0.22),
  foot: new BoxGeometry(0.9, 0.6, 1.4),
  thrusterHousing: new CylinderGeometry(0.3, 0.34, 0.3, 16),
  thrusterNozzle: new CylinderGeometry(0.12, 0.16, 0.18, 14),
} as const;

export const FINGER_IDS = ["index", "middle", "ring", "pinky", "thumb"] as const;

interface RobotPalette {
  shell: string;
  shellDark: string;
  accent: string;
  visor: string;
  dark: string;
  joint: string;
  accentGlow: string;
}

interface MaterialSet {
  shell: MeshStandardMaterial;
  shellDark: MeshStandardMaterial;
  accent: MeshStandardMaterial;
  visor: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  joint: MeshStandardMaterial;
  accentGlow: MeshStandardMaterial;
}

const cache = new Map<string, MaterialSet>();

function build(palette: RobotPalette): MaterialSet {
  const shell = new MeshStandardMaterial({
    color: new Color(palette.shell),
    metalness: 0.72,
    roughness: 0.34,
  });

  const shellDark = new MeshStandardMaterial({
    color: new Color(palette.shellDark),
    metalness: 0.8,
    roughness: 0.46,
  });

  const accent = new MeshStandardMaterial({
    color: new Color(palette.accent),
    metalness: 0.55,
    roughness: 0.3,
  });

  const visor = new MeshStandardMaterial({
    color: new Color(palette.visor),
    metalness: 0.9,
    roughness: 0.12,
    emissive: new Color(palette.visor),
    emissiveIntensity: 0.35,
  });

  const dark = new MeshStandardMaterial({
    color: new Color(palette.dark),
    metalness: 0.1,
    roughness: 0.9,
  });

  const joint = new MeshStandardMaterial({
    color: new Color(palette.joint),
    metalness: 0.95,
    roughness: 0.28,
  });

  const accentGlow = new MeshStandardMaterial({
    color: new Color(palette.accentGlow),
    emissive: new Color(palette.accentGlow),
    emissiveIntensity: 2.1,
    metalness: 0.1,
    roughness: 0.6,
    transparent: true,
    opacity: 0.9,
  });

  return { shell, shellDark, accent, visor, dark, joint, accentGlow };
}

export function createRobotMaterials(accentColor: string): MaterialSet {
  const palette: RobotPalette = {
    shell: "#d8dbe0",
    shellDark: "#8f959e",
    accent: accentColor,
    visor: "#7fd4ff",
    dark: "#14161a",
    joint: "#3f4650",
    accentGlow: accentColor,
  };

  const key = JSON.stringify(palette);
  const existing = cache.get(key);
  if (existing) return existing;

  const built = build(palette);
  cache.set(key, built);
  return built;
}

export function disposeRobotMaterials(): void {
  for (const set of cache.values()) {
    set.shell.dispose();
    set.shellDark.dispose();
    set.accent.dispose();
    set.visor.dispose();
    set.dark.dispose();
    set.joint.dispose();
    set.accentGlow.dispose();
  }
  cache.clear();
}
