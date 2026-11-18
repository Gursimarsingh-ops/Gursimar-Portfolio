import { useMemo, useRef } from "react";
import { useFrame, useTexture } from "@react-three/fiber";
import { BoxGeometry, MeshStandardMaterial, PlaneGeometry } from "three";
import type { Group } from "three";

export interface PortraitFrameProps {
  /** Path to your photograph. If absent, a placeholder renders. */
  imageUrl?: string;
  width?: number;
  height?: number;
  accent: string;
}

export function PortraitFrame({
  imageUrl,
  width = 2.4,
  height = 3.0,
  accent,
}: PortraitFrameProps) {
  const groupRef = useRef<Group>(null);

  const borderMat = useMemo(
    () => new MeshStandardMaterial({ color: "#b8bcc4", metalness: 0.95, roughness: 0.22 }),
    []
  );
  const innerMat = useMemo(
    () => new MeshStandardMaterial({ color: "#14171c", metalness: 0.4, roughness: 0.7 }),
    []
  );
  const glassMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#0a0d12",
        metalness: 0.6,
        roughness: 0.08,
        transparent: true,
        opacity: 0.22,
      }),
    []
  );

  const borderGeo = useMemo(() => new BoxGeometry(width, height, 0.12), [width, height]);
  const innerGeo = useMemo(() => new PlaneGeometry(width - 0.28, height - 0.28), [width, height]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.9) * 0.03;
    g.rotation.y = Math.sin(t * 0.4) * 0.02;
  });

  return (
    <group ref={groupRef} name="portrait-frame">
      <mesh geometry={borderGeo} material={borderMat} />
      <mesh geometry={innerGeo} material={innerMat} position={[0, 0, 0.065]} />

      {imageUrl ? (
        <PortraitImage url={imageUrl} width={width} height={height} />
      ) : (
        <PortraitPlaceholder width={width} height={height} />
      )}

      <mesh geometry={innerGeo} material={glassMat} position={[0, 0, 0.075]} />

      <group name="grip-anchor-left" position={[-width / 2 - 0.02, 0, 0]} />
      <group name="grip-anchor-right" position={[width / 2 + 0.02, 0, 0]} />

      <mesh position={[0, -height / 2 + 0.06, 0.08]}>
        <boxGeometry args={[width - 0.4, 0.03, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function PortraitImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, 0.07]}>
      <planeGeometry args={[width - 0.28, height - 0.28]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function PortraitPlaceholder({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, 0, 0.07]}>
      <planeGeometry args={[width - 0.28, height - 0.28]} />
      <meshStandardMaterial color="#1c2026" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}