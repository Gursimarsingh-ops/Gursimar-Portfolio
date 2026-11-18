import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { KIT, createRobotMaterials, FINGER_IDS } from "./robotKit";

export type RobotSide = "left" | "right";

export interface StudioRobotProps {
  side: RobotSide;
  accent: string;
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

const UPPER_LEN = 0.64;
const FOREARM_LEN = 0.6;
const SHOULDER_Y = 0.95;
const SHOULDER_X = 0.64;

interface ArmPose {
  shoulderYaw: number;
  shoulderPitch: number;
  elbowBend: number;
  wristPitch: number;
  wristRoll: number;
}

const IDLE_ARM: ArmPose = {
  shoulderYaw: 0.12,
  shoulderPitch: 0.16,
  elbowBend: -0.38,
  wristPitch: 0,
  wristRoll: 0,
};

/**
 * Two-bone IK. Computed once per robot from shoulder world position to the
 * grip anchor. No per-frame cost.
 */
function solveArmReach(
  robotPos: [number, number, number],
  target: [number, number, number],
  side: RobotSide,
  gripHand: "left" | "right"
): ArmPose {
  const shoulderX = robotPos[0] + (gripHand === "left" ? -SHOULDER_X : SHOULDER_X);
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

export function StudioRobot({
  side,
  accent,
  position,
  gripTarget,
  gripHand,
  twinThrusters,
  phase,
}: StudioRobotProps) {
  const rootRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const antennaRef = useRef<Group>(null);
  const mouthRef = useRef<Group>(null);

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
      />
      <Arm
        mats={mats}
        side="right"
        pose={gripHand === "right" ? gripPose : IDLE_ARM}
        grip={gripHand === "right"}
      />

      <Leg mats={mats} side="left" />
      <Leg mats={mats} side="right" />

      <Thrusters mats={mats} twin={twinThrusters} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-assemblies                                                      */
/* ------------------------------------------------------------------ */

function Torso({ mats }: { mats: ReturnType<typeof createRobotMaterials> }) {
  return (
    <group name="torso">
      <mesh geometry={KIT.chest} material={mats.shell} position={[0, 0.55, 0]} />
      <mesh geometry={KIT.chestPlate} material={mats.accent} position={[0, 0.78, 0.37]} />
      <mesh geometry={KIT.abdomen} material={mats.shellDark} position={[0, -0.15, 0]} />
      <mesh geometry={KIT.pelvis} material={mats.shellDark} position={[0, -0.5, 0]} />
      <mesh geometry={KIT.backPack} material={mats.shellDark} position={[0, 0.6, -0.46]} />
      <mesh
        geometry={KIT.jointRing}
        material={mats.joint}
        position={[0, 0.55, 0.39]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh geometry={KIT.neck} material={mats.joint} position={[0, 1.28, 0]} />
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
      <mesh geometry={KIT.head} material={mats.shell} />
      <mesh geometry={KIT.headCrown} material={mats.shellDark} position={[0, 0.32, 0]} />
      <mesh geometry={KIT.visor} material={mats.visor} position={[0, 0.07, 0.3]} />
      <mesh geometry={KIT.earDisc} material={mats.joint} position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={KIT.earDisc} material={mats.joint} position={[0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} />

      <group ref={mouthRef} position={[0, -0.15, 0.3]}>
        <mesh geometry={KIT.mouthGrille} material={mats.accentGlow} />
      </group>

      <group ref={antennaRef} position={[0, 0.44, 0]}>
        <mesh geometry={KIT.antennaStem} material={mats.joint} position={[0, 0.18, 0]} />
        <mesh geometry={KIT.antennaTip} material={mats.accentGlow} position={[0, 0.38, 0]} />
      </group>
    </group>
  );
}

function Arm({
  mats,
  side,
  pose,
  grip,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
  pose: ArmPose;
  grip: boolean;
}) {
  const sign = side === "left" ? -1 : 1;

  return (
    <group
      name={`arm-${side}`}
      position={[sign * SHOULDER_X, SHOULDER_Y, 0]}
      rotation={[pose.shoulderPitch, pose.shoulderYaw, 0]}
    >
      <mesh geometry={KIT.shoulderBall} material={mats.joint} />
      <mesh geometry={KIT.shoulderPad} material={mats.shell} position={[sign * 0.12, 0.06, 0]} />

      <group name={`shoulder-joint-${side}`}>
        <mesh geometry={KIT.upperArm} material={mats.shell} position={[0, -0.32, 0]} />
      </group>

      <group
        name={`elbow-joint-${side}`}
        position={[0, -UPPER_LEN, 0]}
        rotation={[pose.elbowBend, 0, 0]}
      >
        <mesh geometry={KIT.elbow} material={mats.joint} />
        <mesh geometry={KIT.forearm} material={mats.shell} position={[0, -0.3, 0]} />
      </group>

      <group
        name={`wrist-joint-${side}`}
        position={[0, -(UPPER_LEN + FOREARM_LEN), 0]}
        rotation={[pose.wristPitch, 0, pose.wristRoll]}
      >
        <mesh geometry={KIT.wrist} material={mats.joint} />
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
    <group name={`hand-root-${side}`} position={[0, -0.15, 0]}>
      <mesh geometry={KIT.palm} material={mats.shell} />
      {FINGER_IDS.map((id, i) => (
        <Finger
          key={id}
          mats={mats}
          side={side}
          id={id}
          offsetX={(i - 1.5) * 0.058}
          curl={curl}
        />
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
    <group name={`finger-${id}-${side}-base`} position={[offsetX, -0.14, 0.02]}>
      <group name={`finger-${id}-${side}-seg1`} rotation={[curl * 0.6, 0, 0]}>
        <mesh geometry={KIT.fingerSeg} material={mats.joint} position={[0, -0.058, 0]} />
        <group
          name={`finger-${id}-${side}-joint2`}
          position={[0, -0.115, 0]}
          rotation={[curl * 0.7, 0, 0]}
        >
          <mesh geometry={KIT.fingerSeg} material={mats.joint} position={[0, -0.058, 0]} />
          <group
            name={`finger-${id}-${side}-joint3`}
            position={[0, -0.115, 0]}
            rotation={[curl * 0.8, 0, 0]}
          >
            <mesh geometry={KIT.fingerSeg} material={mats.joint} position={[0, -0.058, 0]} />
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
    <group
      name={`thumb-${side}-base`}
      position={[sign * 0.14, -0.02, 0.02]}
      rotation={[0, 0, sign * 0.9]}
    >
      <group name={`thumb-${side}-seg1`} rotation={[curl * 0.5, 0, 0]}>
        <mesh geometry={KIT.thumbSeg} material={mats.joint} position={[0, -0.052, 0]} />
        <group
          name={`thumb-${side}-joint2`}
          position={[0, -0.105, 0]}
          rotation={[curl * 0.6, 0, 0]}
        >
          <mesh geometry={KIT.thumbSeg} material={mats.joint} position={[0, -0.052, 0]} />
          <group
            name={`thumb-${side}-joint3`}
            position={[0, -0.105, 0]}
            rotation={[curl * 0.7, 0, 0]}
          >
            <mesh geometry={KIT.thumbSeg} material={mats.joint} position={[0, -0.052, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Leg({
  mats,
  side,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  side: "left" | "right";
}) {
  const sign = side === "left" ? -1 : 1;

  return (
    <group name={`leg-${side}`} position={[sign * 0.3, -0.72, 0]}>
      <mesh geometry={KIT.thigh} material={mats.shell} position={[0, -0.34, 0]} />
      <mesh geometry={KIT.knee} material={mats.joint} position={[0, -0.68, 0]} />
      <mesh geometry={KIT.shin} material={mats.shell} position={[0, -1.0, 0]} />
      <mesh geometry={KIT.boot} material={mats.shellDark} position={[0, -1.36, 0.08]} />
      <mesh geometry={KIT.bootToe} material={mats.accent} position={[0, -1.38, 0.28]} />
    </group>
  );
}

function Thrusters({
  mats,
  twin,
}: {
  mats: ReturnType<typeof createRobotMaterials>;
  twin: boolean;
}) {
  if (twin) {
    return (
      <group name="thrusters">
        <ThrusterUnit mats={mats} position={[-0.24, -1.6, -0.12]} />
        <ThrusterUnit mats={mats} position={[0.24, -1.6, -0.12]} />
      </group>
    );
  }
  return (
    <group name="thrusters">
      <ThrusterUnit mats={mats} position={[0, -1.66, -0.12]} large />
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
    <group position={position} scale={large ? 1.4 : 1}>
      <mesh geometry={KIT.thrusterHousing} material={mats.shellDark} />
      <mesh geometry={KIT.thrusterNozzle} material={mats.accentGlow} position={[0, -0.16, 0]} />
    </group>
  );
}