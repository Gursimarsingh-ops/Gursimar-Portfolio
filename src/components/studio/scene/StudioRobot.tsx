import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, type Mesh } from "three";
import { computeElbow, Segment } from "./geometry";
import { useRobotMaterials, type RobotMaterials } from "./materials";
import { FRAME, RIG, type RobotTheme, type ThrusterStyle, type Vec3 } from "./theme";

export interface StudioRobotProps {
  robot: RobotTheme;
}

/**
 * One studio unit: mechanical torso, articulated arms, five-fingered hands,
 * jointed legs and flying boots. Both units share the rig but differ in shell
 * finish, head architecture, finger count and thruster arrangement.
 */
export function StudioRobot({ robot }: StudioRobotProps) {
  const materials = useRobotMaterials(robot);
  const { side, root } = robot;
  const [rootX, rootY] = root;

  const shoulderY = rootY + RIG.shoulderY;
  const innerShoulder: Vec3 = [rootX - side * RIG.shoulderSpread, shoulderY, 0];
  const outerShoulder: Vec3 = [rootX + side * RIG.shoulderSpread, shoulderY, 0];

  // The inner wrist sits just outside the frame edge; the hand wraps around it.
  const gripWrist: Vec3 = [side * FRAME.gripX, FRAME.gripY, 0];
  const freeWrist: Vec3 = [rootX + side * 0.4, rootY + 0.16, 0.22];

  const gripElbow = computeElbow(innerShoulder, gripWrist, RIG.upperArm, RIG.foreArm, [
    side,
    0.55,
    -0.5,
  ]);
  const freeElbow = computeElbow(outerShoulder, freeWrist, RIG.upperArm, RIG.foreArm, [
    side * 0.6,
    -0.15,
    -1,
  ]);

  return (
    <group>
      <group position={root}>
        <Body robot={robot} materials={materials} />
        {[-1, 1].map((legOffset) => (
          <Leg
            key={legOffset}
            offsetX={legOffset * 0.17}
            materials={materials}
            thrusterStyle={robot.thrusterStyle}
          />
        ))}
      </group>

      {/* Grip arm — shoulder to elbow to wrist, then the hand on the frame. */}
      <mesh position={innerShoulder} material={materials.shell} castShadow>
        <sphereGeometry args={[0.115, 20, 16]} />
      </mesh>
      <Segment from={innerShoulder} to={gripElbow} radius={0.078} material={materials.shellDark} />
      <mesh position={gripElbow} material={materials.joint} castShadow>
        <sphereGeometry args={[0.095, 20, 16]} />
      </mesh>
      <Segment from={gripElbow} to={gripWrist} radius={0.066} material={materials.shell} />
      <GripHand side={side} robot={robot} materials={materials} />

      {/* Free arm, relaxed at the hip. */}
      <mesh position={outerShoulder} material={materials.shell} castShadow>
        <sphereGeometry args={[0.115, 20, 16]} />
      </mesh>
      <Segment from={outerShoulder} to={freeElbow} radius={0.078} material={materials.shellDark} />
      <mesh position={freeElbow} material={materials.joint} castShadow>
        <sphereGeometry args={[0.095, 20, 16]} />
      </mesh>
      <Segment from={freeElbow} to={freeWrist} radius={0.066} material={materials.shell} />
      <FreeHand at={freeWrist} side={side} fingerCount={robot.fingerCount} materials={materials} />
    </group>
  );
}

function Body({ robot, materials: m }: { robot: RobotTheme; materials: RobotMaterials }) {
  return (
    <group>
      {/* Pelvis and waist joint */}
      <mesh material={m.shellDark} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.24, 0.34]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} material={m.joint} castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.1, 18]} />
      </mesh>

      {/* Chest block */}
      <mesh position={[0, 0.52, 0]} material={m.shell} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.66, 0.38]} />
      </mesh>
      <mesh position={[0, 0.6, 0.205]} material={m.panel} castShadow>
        <boxGeometry args={[0.42, 0.3, 0.05]} />
      </mesh>
      <mesh position={[0, 0.6, 0.233]} material={m.eye}>
        <circleGeometry args={[0.045, 24]} />
      </mesh>
      <mesh position={[-0.225, 0.72, 0.19]} material={m.shellDark}>
        <boxGeometry args={[0.07, 0.22, 0.04]} />
      </mesh>
      <mesh position={[0.225, 0.72, 0.19]} material={m.shellDark}>
        <boxGeometry args={[0.07, 0.22, 0.04]} />
      </mesh>

      {/* Collar + backpack */}
      <mesh position={[0, 0.9, 0]} material={m.shellDark} castShadow>
        <boxGeometry args={[0.5, 0.09, 0.32]} />
      </mesh>
      <mesh position={[0, 0.5, -0.25]} material={m.shellDark} castShadow>
        <boxGeometry args={[0.38, 0.44, 0.12]} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.5, -0.315]} material={m.joint}>
          <boxGeometry args={[0.09, 0.26, 0.02]} />
        </mesh>
      ))}

      {/* Shoulder pauldrons */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * RIG.shoulderSpread, RIG.shoulderY, 0]}>
          <mesh material={m.shell} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.32]} />
          </mesh>
          <mesh position={[s * 0.1, 0.02, 0]} material={m.panel} castShadow>
            <boxGeometry args={[0.04, 0.14, 0.26]} />
          </mesh>
        </group>
      ))}

      {/* Neck */}
      <mesh position={[0, 0.97, 0]} material={m.joint} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.13, 16]} />
      </mesh>

      <Head robot={robot} materials={m} />
    </group>
  );
}

function Head({ robot, materials: m }: { robot: RobotTheme; materials: RobotMaterials }) {
  const signal = useRef<Mesh>(null);
  const isDome = robot.headStyle === "dome";

  /*
   * Facial layout is declared here so the eye band and the mouth housing can
   * never drift into each other: the eyes sit in the upper face plate, the
   * mouth is a separate grille below it (dome) or on the jaw block (visor).
   */
  const eyeY = isDome ? 0.025 : 0.032;
  const eyeSpread = isDome ? 0.09 : 0.105;
  const eyeRadius = isDome ? 0.036 : 0.043;
  const eyeZ = isDome ? 0.278 : 0.232;
  const mouthY = isDome ? -0.132 : -0.148;
  const mouthZ = isDome ? 0.242 : 0.208;
  const mouthWidth = isDome ? 0.14 : 0.17;

  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4 + robot.phase);
    if (signal.current) signal.current.scale.setScalar(0.75 + pulse * 0.55);
  });

  return (
    <group position={[0, 1.2, 0]}>
      {isDome ? (
        <>
          <mesh material={m.shell} castShadow receiveShadow>
            <sphereGeometry args={[0.26, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          <mesh position={[0, -0.09, 0]} material={m.shellDark} castShadow>
            <cylinderGeometry args={[0.25, 0.22, 0.2, 28]} />
          </mesh>
          <mesh position={[0, -0.012, 0.228]} material={m.shellDark} castShadow>
            <boxGeometry args={[0.35, 0.16, 0.075]} />
          </mesh>
          <mesh position={[0, 0.083, 0.245]} material={m.chrome} castShadow>
            <boxGeometry args={[0.3, 0.022, 0.05]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={m.shell} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.38, 0.4]} />
          </mesh>
          <mesh position={[0, 0.03, 0.19]} material={m.shellDark} castShadow>
            <boxGeometry args={[0.41, 0.15, 0.06]} />
          </mesh>
          <mesh position={[0, 0.118, 0.196]} material={m.chrome} castShadow>
            <boxGeometry args={[0.42, 0.024, 0.05]} />
          </mesh>
          <mesh position={[0, -0.15, 0.02]} material={m.shellDark} castShadow>
            <boxGeometry args={[0.3, 0.12, 0.34]} />
          </mesh>
        </>
      )}

      {/* Ear discs */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.225, isDome ? -0.04 : 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={m.joint}
          castShadow
        >
          <cylinderGeometry args={[0.085, 0.085, 0.06, 20]} />
        </mesh>
      ))}

      {/* Two independent optical units: recessed socket, lens and chrome bezel */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * eyeSpread, eyeY, eyeZ]}>
          <mesh position={[0, 0, -0.024]} rotation={[Math.PI / 2, 0, 0]} material={m.joint} castShadow>
            <cylinderGeometry args={[eyeRadius * 1.5, eyeRadius * 1.5, 0.04, 24]} />
          </mesh>
          <mesh material={m.eye}>
            <sphereGeometry args={[eyeRadius, 24, 18]} />
          </mesh>
          <mesh position={[0, 0, 0.006]} material={m.chrome}>
            <torusGeometry args={[eyeRadius * 1.2, 0.0065, 10, 26]} />
          </mesh>
          {/* Each eye carries its own controlled light source */}
          <pointLight
            position={[0, 0, 0.12]}
            color={robot.eye}
            intensity={robot.eyeLight}
            distance={0.44}
            decay={2}
          />
        </group>
      ))}

      <Mouth color={robot.mouth} phase={robot.phase} y={mouthY} z={mouthZ} width={mouthWidth} />

      {/* Antenna with pulsing signal */}
      <group position={[0, isDome ? 0.255 : 0.225, 0]}>
        <mesh position={[0, 0.03, 0]} material={m.joint}>
          <cylinderGeometry args={[0.028, 0.04, 0.07, 12]} />
        </mesh>
        <mesh position={[0, 0.17, 0]} material={m.chrome}>
          <cylinderGeometry args={[0.012, 0.014, 0.24, 8]} />
        </mesh>
        <mesh ref={signal} position={[0, 0.31, 0]}>
          <sphereGeometry args={[0.036, 16, 12]} />
          <meshStandardMaterial color={robot.eye} emissive={robot.eye} emissiveIntensity={2.6} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A self-contained mechanical mouth: dark recessed grille, machined chrome
 * lips and a short equaliser core. It reads as a mouth on its own, never as a
 * third eye.
 */
function Mouth({
  color,
  phase,
  y,
  z,
  width,
}: {
  color: string;
  phase: number;
  y: number;
  z: number;
  width: number;
}) {
  const bars = useRef<Mesh[]>([]);
  const count = 5;
  const gap = width / count;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 5.2 + phase;
    bars.current.forEach((bar, index) => {
      if (!bar) return;
      const wave = Math.abs(Math.sin(t + index * 0.7));
      const level = 0.3 + wave * 0.7;
      bar.scale.y = level;
      bar.position.y = (1 - level) * 0.016;
    });
  });

  return (
    <group position={[0, y, z]}>
      {/* Recessed housing keeps the core visually separate from the face plate */}
      <mesh position={[0, 0, -0.024]} material-color="#07080b" material-metalness={0.55} material-roughness={0.55}>
        <boxGeometry args={[width + 0.05, 0.062, 0.03]} />
      </mesh>

      {/* Machined lips */}
      {[0.038, -0.038].map((ly) => (
        <mesh key={ly} position={[0, ly, 0.002]} material-color="#cfd3da" material-metalness={0.95} material-roughness={0.26}>
          <boxGeometry args={[width + 0.056, 0.009, 0.028]} />
        </mesh>
      ))}

      {Array.from({ length: count }).map((_, index) => {
        const x = (index - (count - 1) / 2) * gap;
        return (
          <mesh
            key={index}
            ref={(bar) => {
              if (bar) bars.current[index] = bar;
            }}
            position={[x, 0, 0.004]}
          >
            <boxGeometry args={[0.013, 0.036, 0.012]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.5}
              roughness={0.35}
              metalness={0}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Leg({
  offsetX,
  materials: m,
  thrusterStyle,
}: {
  offsetX: number;
  materials: RobotMaterials;
  thrusterStyle: ThrusterStyle;
}) {
  const hip: Vec3 = [offsetX, -0.04, 0];
  const knee: Vec3 = [offsetX, -0.42, 0.03];
  const ankle: Vec3 = [offsetX, -0.72, 0.01];

  return (
    <group>
      <mesh position={hip} material={m.joint} castShadow>
        <sphereGeometry args={[0.095, 18, 14]} />
      </mesh>
      <Segment from={hip} to={knee} radius={0.085} material={m.shellDark} />
      <mesh position={knee} material={m.joint} castShadow>
        <sphereGeometry args={[0.09, 18, 14]} />
      </mesh>
      <mesh position={knee} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 14]} />
      </mesh>
      <Segment from={knee} to={ankle} radius={0.072} material={m.shell} />
      <mesh position={ankle} material={m.joint} castShadow>
        <sphereGeometry args={[0.075, 16, 12]} />
      </mesh>
      <Boot at={[offsetX, -0.8, 0.05]} materials={m} thrusterStyle={thrusterStyle} />
    </group>
  );
}

function Boot({
  at,
  materials: m,
  thrusterStyle,
}: {
  at: Vec3;
  materials: RobotMaterials;
  thrusterStyle: ThrusterStyle;
}) {
  const [x, y, z] = at;

  return (
    <group position={[x, y, z]}>
      <mesh material={m.shell} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.16, 0.36]} />
      </mesh>
      <mesh position={[0, -0.04, 0.24]} material={m.shellDark} castShadow>
        <boxGeometry args={[0.22, 0.09, 0.14]} />
      </mesh>
      <mesh position={[0, -0.09, 0.02]} material={m.joint} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.32]} />
      </mesh>
      <mesh position={[0, 0.08, -0.02]} material={m.panel}>
        <boxGeometry args={[0.2, 0.05, 0.28]} />
      </mesh>
      <mesh position={[0, 0.09, 0.1]} material={m.eye}>
        <boxGeometry args={[0.08, 0.015, 0.015]} />
      </mesh>

      {thrusterStyle === "twin" ? (
        <>
          <Thruster position={[-0.055, -0.1, -0.15]} materials={m} />
          <Thruster position={[0.055, -0.1, -0.15]} materials={m} />
        </>
      ) : (
        <Thruster position={[0, -0.11, -0.13]} materials={m} scale={1.15} />
      )}
    </group>
  );
}

function Thruster({
  position,
  materials: m,
  scale = 1,
}: {
  position: Vec3;
  materials: RobotMaterials;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh material={m.chrome} castShadow>
        <cylinderGeometry args={[0.048, 0.062, 0.08, 16]} />
      </mesh>
      {/* nozzle lip burns steady */}
      <mesh position={[0, -0.047, 0]} material={m.thruster}>
        <cylinderGeometry args={[0.05, 0.05, 0.014, 20]} />
      </mesh>
      {/* soft downwash rather than a solid plume */}
      <mesh position={[0, -0.078, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.048, 0.075, 16, 1, true]} />
        <meshBasicMaterial
          color={m.thruster.color}
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.085, 20]} />
        <meshBasicMaterial
          color={m.thruster.color}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, -0.12, 0]} color={m.thruster.color} intensity={0.3} distance={0.65} decay={2} />
    </group>
  );
}

/**
 * The gripping hand. The palm sits just outside the frame edge, four fingers
 * (or three, on the ivory unit) curl over the front face and the thumb closes
 * behind the edge, so the frame is genuinely clasped in both hands.
 */
function GripHand({
  side,
  robot,
  materials: m,
}: {
  side: 1 | -1;
  robot: RobotTheme;
  materials: RobotMaterials;
}) {
  const edge = FRAME.width / 2;
  const y = FRAME.gripY;
  const palmX = side * (edge + 0.085);
  const fingerOffsets = robot.fingerCount === 4 ? [0.1, 0.034, -0.034, -0.1] : [0.082, 0, -0.082];

  return (
    <group>
      {/* Back of the hand, tucked behind the frame face */}
      <mesh position={[palmX, y, -0.01]} material={m.shell} castShadow receiveShadow>
        <boxGeometry args={[0.11, 0.24, 0.17]} />
      </mesh>
      {/* Knuckle bar the fingers hinge from */}
      <mesh position={[side * (edge + 0.025), y, 0.068]} material={m.chrome} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.26, 14]} />
      </mesh>
      {/* Wrist joint back to the forearm */}
      <mesh position={[side * (edge + 0.19), y, 0]} material={m.joint} castShadow>
        <sphereGeometry args={[0.062, 18, 14]} />
      </mesh>
      <Segment
        from={[side * (edge + 0.16), y, 0]}
        to={[side * (edge + 0.25), y, 0]}
        radius={0.048}
        material={m.chrome}
      />

      {fingerOffsets.map((dy) => {
        const fy = y + dy;
        const k1: Vec3 = [side * (edge + 0.02), fy, 0.068];
        const k2: Vec3 = [side * (edge - 0.035), fy, 0.086];
        const k3: Vec3 = [side * (edge - 0.085), fy, 0.082];
        const tip: Vec3 = [side * (edge - 0.108), fy - 0.014, 0.062];

        return (
          <group key={dy}>
            <Segment from={[side * (edge + 0.05), fy, 0.03]} to={k1} radius={0.024} material={m.chrome} />
            <Segment from={k1} to={k2} radius={0.022} material={m.chrome} />
            <Segment from={k2} to={k3} radius={0.02} material={m.chrome} />
            <Segment from={k3} to={tip} radius={0.018} material={m.chrome} />
            {[k1, k2, k3].map((joint) => (
              <mesh key={joint.join(":")} position={joint} material={m.joint}>
                <sphereGeometry args={[0.024, 12, 10]} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Thumb closing over the frame face below the fingers */}
      <Segment
        from={[side * (edge + 0.05), y - 0.105, 0.025]}
        to={[side * (edge - 0.055), y - 0.158, 0.078]}
        radius={0.028}
        material={m.chrome}
      />
      <Segment
        from={[side * (edge - 0.055), y - 0.158, 0.078]}
        to={[side * (edge - 0.095), y - 0.182, 0.062]}
        radius={0.024}
        material={m.chrome}
      />
      <mesh position={[side * (edge - 0.095), y - 0.182, 0.062]} material={m.joint}>
        <sphereGeometry args={[0.026, 14, 12]} />
      </mesh>
    </group>
  );
}

function FreeHand({
  at,
  side,
  fingerCount,
  materials: m,
}: {
  at: Vec3;
  side: 1 | -1;
  fingerCount: 3 | 4;
  materials: RobotMaterials;
}) {
  const offsets = fingerCount === 4 ? [-0.05, -0.017, 0.017, 0.05] : [-0.045, 0, 0.045];

  return (
    <group position={at}>
      <mesh material={m.shell} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.18, 0.13]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={m.chrome}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 14]} />
      </mesh>

      {offsets.map((fx) => (
        <group key={fx}>
          <Segment from={[fx, -0.08, 0.01]} to={[fx * 1.15, -0.15, 0.04]} radius={0.019} material={m.chrome} />
          <Segment from={[fx * 1.15, -0.15, 0.04]} to={[fx * 1.3, -0.21, 0.07]} radius={0.016} material={m.chrome} />
          <mesh position={[fx * 1.15, -0.15, 0.04]} material={m.joint}>
            <sphereGeometry args={[0.021, 12, 10]} />
          </mesh>
        </group>
      ))}

      <Segment
        from={[side * -0.07, -0.02, 0.04]}
        to={[side * -0.11, -0.1, 0.09]}
        radius={0.022}
        material={m.chrome}
      />
    </group>
  );
}
