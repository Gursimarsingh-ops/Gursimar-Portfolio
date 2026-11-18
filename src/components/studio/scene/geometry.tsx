import { useMemo } from "react";
import { Quaternion, Vector3, type Material } from "three";
import type { Vec3 } from "./theme";

/**
 * Two-bone arm solve: returns the elbow position for a shoulder/wrist pair.
 * The bend direction keeps elbows pointing back and away from the body,
 * which is what makes the grip read as weight-bearing rather than floating.
 */
export function computeElbow(
  shoulder: Vec3,
  wrist: Vec3,
  upperLength: number,
  foreLength: number,
  bendDir: Vec3
): Vec3 {
  const s = new Vector3(...shoulder);
  const w = new Vector3(...wrist);
  const delta = w.clone().sub(s);
  const reach = Math.min(delta.length() || 0.001, upperLength + foreLength - 0.002);
  const direction = delta.clone().normalize();

  const along = (upperLength * upperLength - foreLength * foreLength + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(upperLength * upperLength - along * along, 0.0004));

  const bend = new Vector3(...bendDir).normalize();
  const perpendicular = bend.clone().sub(direction.clone().multiplyScalar(bend.dot(direction))).normalize();

  const elbow = s.clone().addScaledVector(direction, along).addScaledVector(perpendicular, height);
  return [elbow.x, elbow.y, elbow.z];
}

export interface SegmentProps {
  from: Vec3;
  to: Vec3;
  radius: number;
  material: Material;
  taper?: number;
  radialSegments?: number;
}

/** A cylinder stretched between two points — used for every limb bone. */
export function Segment({ from, to, radius, material, taper = 0.92, radialSegments = 14 }: SegmentProps) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const delta = b.clone().sub(a);
    const span = Math.max(delta.length(), 0.001);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize());
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion: quat, length: span };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} material={material} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius * taper, length, radialSegments]} />
    </mesh>
  );
}
