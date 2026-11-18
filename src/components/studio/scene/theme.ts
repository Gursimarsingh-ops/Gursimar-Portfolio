/**
 * Shared art direction for Studio 01.
 * Every measurement the scene depends on lives here so proportions,
 * grip alignment and lighting stay in one place.
 */

export type Vec3 = [number, number, number];

/** The suspended portrait frame. */
export const FRAME = {
  width: 2.0,
  height: 2.5,
  depth: 0.1,
  border: 0.085,
  /** World-space Y of the frame centre. */
  centerY: 0.25,
  /** World-space Y where both hands grip the frame edges. */
  gripY: 0.35,
  /** World-space |X| of the wrist that bites down on the frame edge. */
  gripX: 1.14,
} as const;

/** Shared humanoid rig. */
export const RIG = {
  shoulderY: 0.86,
  shoulderSpread: 0.36,
  upperArm: 0.44,
  foreArm: 0.4,
  groundY: -1.82,
} as const;

export type GripHand = "left" | "right";
export type HeadStyle = "visor" | "dome";
export type ThrusterStyle = "twin" | "single";

export interface RobotTheme {
  id: "a" | "b";
  /** Short technical designation shown in the section chrome. */
  designation: string;
  /**
   * +1 places the unit on the viewer's right, -1 on the viewer's left.
   * A unit standing on the viewer's right holds the frame's right edge with
   * its right hand; the mirrored unit holds the left edge with its left hand.
   */
  side: 1 | -1;
  gripHand: GripHand;
  /** World-space root of the body (hip height). */
  root: Vec3;
  shell: string;
  shellDark: string;
  panel: string;
  joint: string;
  chrome: string;
  eye: string;
  /** Emissive strength of the eye lenses — tuned per unit so neither blooms. */
  eyeGlow: number;
  /** Intensity of the point light sitting in front of each individual eye. */
  eyeLight: number;
  mouth: string;
  thruster: string;
  headStyle: HeadStyle;
  fingerCount: 3 | 4;
  thrusterStyle: ThrusterStyle;
  /** Animation phase so the pair never pulses in lockstep. */
  phase: number;
}

export const ROBOTS: readonly RobotTheme[] = [
  {
    id: "a",
    designation: "A-01 / ATLAS",
    side: 1,
    gripHand: "right",
    root: [2.05, -0.72, 0],
    shell: "#3a3f47",
    shellDark: "#1b1e24",
    panel: "#d7d9dd",
    joint: "#5b6069",
    chrome: "#e8eaee",
    eye: "#dcf1ff",
    eyeGlow: 1.1,
    eyeLight: 0.16,
    mouth: "#bfe9ff",
    thruster: "#cfe6ff",
    headStyle: "visor",
    fingerCount: 4,
    thrusterStyle: "twin",
    phase: 0,
  },
  {
    id: "b",
    designation: "V-02 / VEGA",
    side: -1,
    gripHand: "left",
    root: [-2.05, -0.72, 0],
    shell: "#d9d8d2",
    shellDark: "#a9a8a1",
    panel: "#23262c",
    joint: "#70737b",
    chrome: "#f2f2ee",
    eye: "#ffe6c6",
    eyeGlow: 1.55,
    eyeLight: 0.24,
    mouth: "#ffd0a2",
    thruster: "#ffe2bb",
    headStyle: "dome",
    fingerCount: 3,
    thrusterStyle: "single",
    phase: Math.PI * 0.8,
  },
] as const;
