import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { GEO, createRobotMaterials, FINGER_IDS } from "./robotParts";

export type RobotSide = "left" | "right";

export interface ArtistRobotProps {
  side: RobotSide;
  accent: string;
  /** World position of the robot root. */
  position: [number, number, number];
  /** World position the gripping hand must reach. */
  gripTarget: [number, number, number];
  /** Which hand grips the frame. */
  gripHand: "left" | "right";
  /** Twin thrusters (right robot) or single (left robot). */
  twinThrusters: boolean;
  /** Phase offset so the two robots never move in lockstep. */
  phase: number;
}

/**
 * One fully procedural robot. All geometry and materials come from the shared
 * factories in robotParts.ts. The gripping arm is posed once to a fixed
 * reach pose; the free arm idles.
 */
export function ArtistRobot({
  side,
  accent,
  position,
  gripTarget,
  gripHand,
  twinThrusters,
  phase,
}: ArtistRobotProps) {
  const rootRef = useRef<Group | null>(null);
  const headRef = useRef<Group | null>(null);
  const antennaRef = useRef<Group | null>(null);
  const mouthRef = useRef<Group | null>(null);
  const gripArmRef = useRef<Group | null>(null);

  const mats = useMemo(() => createRobotMaterials(accent), [accent]);

  const gripPose = useMemo(
    () => solveArmReach(position, gripTarget, side, gripHand),
    [position, gripTarget, side, gripHand]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;

    const root = rootRef.current;
    if (root) {
      root.position.y = position[1] + Math.sin(t * 1.1) * 0.05;
      root.rotation.z = Math.sin(t * 0.6) * 0.02;
      root.rotation.x = Math.sin(t * 0.8) * 0.015;
    }

    const head = headRef.current;
    if (head) {
      head.rotation.y = Math.sin(t * 0.45) * 0.12;
      head.rotation.x = Math.sin(t * 0.7) * 0.05;
    }

    const antenna = antennaRef.current;
    if (antenna) {
      const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;
      antenna.scale.setScalar(0.9 + pulse * 0.25);
    }

    const mouth = mouthRef.current;
    if (mouth) {
      const glow = 0.6 + Math.sin(t * 4.5) * 0.4;
      mouth.scale.x = 0.85 + glow * 0.3;
    }
  });

  return (
    <group ref={rootRef} position={position} name={`robot-${side}`}>
      <Torso mats={mats} />
      <group ref={headRef} position={[0, 1.35, 0]}>
        <Head mats={mats} antennaRef={antennaRef} mouthRef={mouthRef} />
      </group>

      <Arm
        mats={mats}
        side="left"
        pose={gripHand === "left" ? gripPose : IDLE_ARM}
        grip={gripHand === "left"}
        armRef={gripHand === "left" ? gripArmRef : undefined}
      />
      <Arm
        mats={mats}
        side="right"
        pose={gripHand === "right" ? gripPose : IDLE_ARM}
        grip={gripHand === "right"}
        armRef={gripHand === "right" ? gripArmRef : undefined}
      />

      <Leg mats={mats} side="left" />
      <Leg mats={mats} side="right" />

      <Thrusters mats={mats} twin={twinThrusters} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Arm reach solve — two-bone IK, computed once, no per-frame cost.    */
/* ------------------------------------------------------------------ */

const UPPER_LEN = 0.62;
const FOREARM_LEN = 0.58;
const SHOULDER_Y = 0.95;

interface ArmPose {
  shoulderYaw: number;
  shoulderPitch: number;
  elbowBend: number;
  wristPitch: number;
  wristRoll: number;
}

const IDLE_ARM: ArmPose = {
  shoulderYaw: 0.1,
  shoulderPitch: 0.15,
  elbowBend: -0.35,
  wristPitch: 0,
  wristRoll: 0,
};

function solveArmReach(
  robotPos: [number, number, number],
  target: [number, number, number],
  side: RobotSide,
  gripHand: "left" | "right"
): ArmPose {
  const shoulderX = robotPos[0] + (gripHand === "left" ? -0.62 : 0.62);
  const shoulderY = robotPos[1] + SHOULDER_Y;
  const shoulderZ = robotPos[2];

  const dx = target[0] - shoulderX;
  const dy = target[1] - shoulderY;
  const dz = target[2] - shoulderZ;

  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const clamped = Math.min(dist, UPPER_LEN + FOREARM_LEN - 0.02);

  const cosElbow =
    (UPPER_LEN * UPPER_LEN + FOREARM_LEN * FOREARM_LEN - clamped * clamped) /
    (2 * UPPER_LEN * FOREARM_LEN);
  const elbowBend = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosElbow)));

  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

  const inward = side === "left" ? 1 : -1;

  return {
    shoulderYaw: yaw,
    shoulderPitch: pitch - 0.25,
    elbowBend: -elbowBend,
    wristPitch: 0.35,
    wristRoll: inward * 0.9,
  };
}

/* ------------------------------------------------------------------ */
/* Sub-assemblies                                                      */
/* ------------------------------------------------------------------ */

function Torso({ mats }: { mats: ReturnType<typeof createRobotMaterials> }) {
  return (
    <group name="torso">
      <mesh geometry={GEO.torso} material={mats.shell} position={[0, 0.55, 0]} />
      <mesh geometry={GEO.chestPlate} material={mats.accent} position={[0, 0.75, 0.36]} />
      <mesh geometry={GEO.pelvis} material={mats.dark} position={[0, -0.25, 0]} />
      <mesh geometry={GEO.backPack} material={mats.dark} position={[0, 0.6, -0.45]} />
      <mesh geometry={GEO.jointRing} material={mats.joint} position={[0, 0.55, 0.38]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Head({
  mats,
  antennaRef,
  mouthRef,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  antennaRef: React.RefObject<Group | null>;
  mouthRef: React.RefObject<Group | null>;
}) {
  return (
    <group name="head">
      <mesh geometry={GEO.head} material={mats.shell} />
      <mesh geometry={GEO.headVisor} material={mats.visor} position={[0, 0.06, 0.29]} />
      <group ref={mouthRef} position={[0, -0.14, 0.29]}>
        <mesh geometry={GEO.mouthGrille} material={mats.accentGlow} />
      </group>
      <group ref={antennaRef} position={[0, 0.42, 0]}>
        <mesh geometry={GEO.antennaStem} material={mats.joint} position={[0, 0.17, 0]} />
        <mesh geometry={GEO.antennaTip} material={mats.accentGlow} position={[0, 0.36, 0]} />
      </group>
    </group>
  );
}

function Arm({
  mats,
  side,
  pose,
  grip,
  armRef,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
  pose: ArmPose;
  grip: boolean;
  armRef?: React.RefObject<Group | null>;
}) {
  const sign = side === "left" ? -1 : 1;

  return (
    <group
      ref={armRef}
      name={`arm-${side}`}
      position={[sign * 0.62, 0.95, 0]}
      rotation={[pose.shoulderPitch, pose.shoulderYaw, 0]}
    >
      <mesh geometry={GEO.shoulder} material={mats.joint} />
      <mesh geometry={GEO.shoulderPad} material={mats.shell} position={[sign * 0.1, 0.05, 0]} />

      <group name={`shoulder-joint-${side}`}>
        <mesh geometry={GEO.upperArm} material={mats.shell} position={[0, -0.31, 0]} />
      </group>

      <group name={`elbow-joint-${side}`} position={[0, -0.62, 0]} rotation={[pose.elbowBend, 0, 0]}>
        <mesh geometry={GEO.elbow} material={mats.joint} />
        <mesh geometry={GEO.forearm} material={mats.shell} position={[0, -0.29, 0]} />
      </group>

      <group
        name={`wrist-joint-${side}`}
        position={[0, -1.2, 0]}
        rotation={[pose.wristPitch, 0, pose.wristRoll]}
      >
        <mesh geometry={GEO.wrist} material={mats.joint} />
        <Hand mats={mats} side={side} grip={grip} />
      </group>
    </group>
  );
}

function Hand({
  mats,
  side,
  grip,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
  grip: boolean;
}) {
  const curl = grip ? 1.15 : 0.2;

  return (
    <group name={`hand-root-${side}`} position={[0, -0.14, 0]}>
      <mesh geometry={GEO.palm} material={mats.shell} />
      {FINGER_IDS.map((id, i) => (
        <Finger key={id} mats={mats} side={side} id={id} offsetX={(i - 1.5) * 0.055} curl={curl} />
      ))}
      <Thumb mats={mats} side={side} curl={curl} />
    </group>
  );
}

function Finger({
  mats,
  side,
  id,
  offsetX,
  curl,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
  id: string;
  offsetX: number;
  curl: number;
}) {
  return (
    <group name={`finger-${id}-${side}-base`} position={[offsetX, -0.13, 0.02]}>
      <group name={`finger-${id}-${side}-seg1`} rotation={[curl * 0.6, 0, 0]}>
        <mesh geometry={GEO.fingerSeg} material={mats.joint} position={[0, -0.055, 0]} />
        <group name={`finger-${id}-${side}-joint2`} position={[0, -0.11, 0]} rotation={[curl * 0.7, 0, 0]}>
          <mesh geometry={GEO.fingerSeg} material={mats.joint} position={[0, -0.055, 0]} />
          <group name={`finger-${id}-${side}-joint3`} position={[0, -0.11, 0]} rotation={[curl * 0.8, 0, 0]}>
            <mesh geometry={GEO.fingerSeg} material={mats.joint} position={[0, -0.055, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Thumb({
  mats,
  side,
  curl,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
  curl: number;
}) {
  const sign = side === "left" ? 1 : -1;

  return (
    <group name={`thumb-${side}-base`} position={[sign * 0.13, -0.02, 0.02]} rotation={[0, 0, sign * 0.9]}>
      <group name={`thumb-${side}-seg1`} rotation={[curl * 0.5, 0, 0]}>
        <mesh geometry={GEO.thumbSeg} material={mats.joint} position={[0, -0.05, 0]} />
        <group name={`thumb-${side}-joint2`} position={[0, -0.1, 0]} rotation={[curl * 0.6, 0, 0]}>
          <mesh geometry={GEO.thumbSeg} material={mats.joint} position={[0, -0.05, 0]} />
          <group name={`thumb-${side}-joint3`} position={[0, -0.1, 0]} rotation={[curl * 0.7, 0, 0]}>
            <mesh geometry={GEO.thumbSeg} material={mats.joint} position={[0, -0.05, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Leg({ mats, side }: { mats: ReturnType<typeof createRobotMaterials>; side: "left" | "right" }) {
  const sign = side === "left" ? -1 : 1;

  return (
    <group name={`leg-${side}`} position={[sign * 0.28, -0.45, 0]}>
      <mesh geometry={GEO.thigh} material={mats.shell} position={[0, -0.33, 0]} />
      <mesh geometry={GEO.knee} material={mats.joint} position={[0, -0.66, 0]} />
      <mesh geometry={GEO.shin} material={mats.shell} position={[0, -0.97, 0]} />
      <mesh geometry={GEO.foot} material={mats.dark} position={[0, -1.3, 0.08]} />
    </group>
  );
}

function Thrusters({ mats, twin }: { mats: ReturnType<typeof createRobotMaterials>; twin: boolean }) {
  if (twin) {
    return (
      <group name="thrusters">
        <ThrusterUnit mats={mats} position={[-0.22, -1.55, -0.1]} />
        <ThrusterUnit mats={mats} position={[0.22, -1.55, -0.1]} />
      </group>
    );
  }
  return (
    <group name="thrusters">
      <ThrusterUnit mats={mats} position={[0, -1.6, -0.1]} large />
    </group>
  );
}

function ThrusterUnit({
  mats,
  position,
  large,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  position: [number, number, number];
  large?: boolean;
}) {
  return (
    <group position={position} scale={large ? 1.35 : 1}>
      <mesh geometry={GEO.thrusterHousing} material={mats.dark} />
      <mesh geometry={GEO.thrusterNozzle} material={mats.accentGlow} position={[0, -0.15, 0]} />
    </group>
  );
}