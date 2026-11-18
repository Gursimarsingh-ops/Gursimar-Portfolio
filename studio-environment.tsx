import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, MeshStandardMaterial, SphereGeometry } from "three";
import type { Group } from "three";

export interface StudioEnvironmentProps {
  accentLeft: string;
  accentRight: string;
}

/**
 * Hanging studio lamps, overhead spotlights and a soft backdrop.
 * All geometry and materials are memoized.
 */
export function StudioEnvironment({ accentLeft, accentRight }: StudioEnvironmentProps) {
  const lampGeo = useMemo(() => new CylinderGeometry(0.22, 0.32, 0.35, 16), []);
  const bulbGeo = useMemo(() => new SphereGeometry(0.14, 16, 16), []);
  const cordGeo = useMemo(() => new CylinderGeometry(0.012, 0.012, 3.2, 6), []);

  const shellMat = useMemo(
    () => new MeshStandardMaterial({ color: "#2c3038", metalness: 0.9, roughness: 0.3 }),
    []
  );
  const leftBulbMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: accentLeft,
        emissive: accentLeft,
        emissiveIntensity: 2.2,
      }),
    [accentLeft]
  );
  const rightBulbMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: accentRight,
        emissive: accentRight,
        emissiveIntensity: 2.2,
      }),
    [accentRight]
  );

  const lampGroupRef = useRef<Group>(null);

  useFrame((state) => {
    const g = lampGroupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = Math.sin(t * 0.15) * 0.04;
  });

  return (
    <group name="studio-environment">
      {/* Backdrop */}
      <mesh position={[0, 1.5, -6]}>
        <planeGeometry args={[26, 14]} />
        <meshStandardMaterial color="#0d1014" metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#0a0c10" metalness={0.5} roughness={0.6} />
      </mesh>

      <group ref={lampGroupRef}>
        <HangingLamp
          position={[-3.4, 3.6, -0.6]}
          lampGeo={lampGeo}
          bulbGeo={bulbGeo}
          cordGeo={cordGeo}
          shellMat={shellMat}
          bulbMat={leftBulbMat}
        />
        <HangingLamp
          position={[3.4, 3.6, -0.6]}
          lampGeo={lampGeo}
          bulbGeo={bulbGeo}
          cordGeo={cordGeo}
          shellMat={shellMat}
          bulbMat={rightBulbMat}
        />
        <HangingLamp
          position={[0, 4.2, -1.4]}
          lampGeo={lampGeo}
          bulbGeo={bulbGeo}
          cordGeo={cordGeo}
          shellMat={shellMat}
          bulbMat={leftBulbMat}
        />
      </group>

      {/* Overhead spotlights aimed at the portrait. */}
      <spotLight
        position={[0, 5.5, 1.5]}
        angle={0.5}
        penumbra={0.8}
        intensity={2.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[-4, 3, 2]}
        angle={0.6}
        penumbra={0.9}
        intensity={1.4}
        color={accentLeft}
      />
      <spotLight
        position={[4, 3, 2]}
        angle={0.6}
        penumbra={0.9}
        intensity={1.4}
        color={accentRight}
      />

      {/* Rim lights */}
      <pointLight position={[-5, 1, -3]} intensity={0.9} color={accentLeft} />
      <pointLight position={[5, 1, -3]} intensity={0.9} color={accentRight} />

      {/* Ambient fill */}
      <ambientLight intensity={0.18} />
    </group>
  );
}

function HangingLamp({
  position,
  lampGeo,
  bulbGeo,
  cordGeo,
  shellMat,
  bulbMat,
}: {
  position: [number, number, number];
  lampGeo: CylinderGeometry;
  bulbGeo: SphereGeometry;
  cordGeo: CylinderGeometry;
  shellMat: MeshStandardMaterial;
  bulbMat: MeshStandardMaterial;
}) {
  return (
    <group position={position}>
      <mesh geometry={cordGeo} material={shellMat} position={[0, 1.6, 0]} />
      <mesh geometry={lampGeo} material={shellMat} />
      <mesh geometry={bulbGeo} material={bulbMat} position={[0, -0.2, 0]} />
    </group>
  );
}