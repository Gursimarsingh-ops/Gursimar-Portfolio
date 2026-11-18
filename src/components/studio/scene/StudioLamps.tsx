import { DoubleSide } from "three";

interface PendantLampProps {
  x: number;
  z: number;
  shadeY: number;
  cableTop: number;
  intensity: number;
  castShadow?: boolean;
}

/**
 * Practical studio pendant: cable, metal shade, warm bulb and a real spotlight.
 * Hanging from above the camera frame keeps the stage cinematic and grounded.
 */
function PendantLamp({ x, z, shadeY, cableTop, intensity, castShadow = false }: PendantLampProps) {
  const cableLength = Math.max(cableTop - shadeY, 0.2);

  return (
    <group>
      <mesh position={[x, shadeY + cableLength / 2, z]}>
        <cylinderGeometry args={[0.014, 0.014, cableLength, 8]} />
        <meshStandardMaterial color="#3c4149" roughness={0.7} metalness={0.5} />
      </mesh>

      <mesh position={[x, cableTop, z]}>
        <cylinderGeometry args={[0.055, 0.085, 0.1, 16]} />
        <meshStandardMaterial color="#1b1e24" roughness={0.7} metalness={0.45} />
      </mesh>

      {/* Outer shade */}
      <mesh position={[x, shadeY + 0.17, z]} castShadow>
        <coneGeometry args={[0.3, 0.34, 40, 1, true]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.42} metalness={0.68} side={DoubleSide} />
      </mesh>

      {/* Inner reflector */}
      <mesh position={[x, shadeY + 0.07, z]}>
        <coneGeometry args={[0.275, 0.28, 32, 1, true]} />
        <meshStandardMaterial
          color="#f2ece1"
          roughness={0.55}
          metalness={0.2}
          side={DoubleSide}
          emissive="#ffe6c2"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Bulb */}
      <mesh position={[x, shadeY + 0.12, z]}>
        <sphereGeometry args={[0.085, 20, 16]} />
        <meshStandardMaterial color="#fff6e6" emissive="#ffdfa8" emissiveIntensity={3} toneMapped={false} />
      </mesh>

      <spotLight
        position={[x, shadeY + 0.02, z]}
        angle={0.72}
        penumbra={1}
        intensity={intensity}
        distance={9}
        decay={2}
        color="#ffe9c6"
        castShadow={castShadow}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0008}
      />
      <pointLight
        position={[x, shadeY + 0.02, z]}
        intensity={intensity * 0.1}
        distance={3}
        decay={2}
        color="#ffe9c6"
      />
    </group>
  );
}

const LAMPS: readonly PendantLampProps[] = [
  { x: -1.85, z: -0.75, shadeY: 2.0, cableTop: 3.6, intensity: 22 },
  { x: 1.7, z: -1.05, shadeY: 2.15, cableTop: 3.7, intensity: 16, castShadow: true },
  { x: 0.1, z: -2.3, shadeY: 2.45, cableTop: 3.8, intensity: 12 },
];

export function StudioLamps() {
  return (
    <group>
      {LAMPS.map((lamp) => (
        <PendantLamp key={`${lamp.x}-${lamp.z}`} {...lamp} />
      ))}
    </group>
  );
}
