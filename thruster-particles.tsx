import { useMemo } from "react";
import { useThrusterParticles } from "./use-thruster-particles";
import type { RobotVariant } from "./src/components/robot-scene/robots/robotConfig";

export interface ThrusterParticlesProps {
  variant: RobotVariant;
  /** World-space offset of the thruster outlet relative to the robot root. */
  offset: [number, number, number];
}

/**
 * Renders one thruster particle emitter at a boot outlet.
 * Geometry and material are created once and reused.
 */
export function ThrusterParticles({ variant, offset }: ThrusterParticlesProps) {
  const { pointsRef } = useThrusterParticles({ variant });

  const geometry = useMemo(() => {
    const count = 220;
    const positions = new Float32Array(count * 3);
    const geo = new (require("three").BufferGeometry)();
    geo.setAttribute("position", new (require("three").BufferAttribute)(positions, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new (require("three").PointsMaterial)({
        color: variant.palette.accent,
        size: 0.06,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [variant.palette.accent]
  );

  return (
    <points
      ref={pointsRef}
      name={`thruster-particles-${variant.id}`}
      position={offset}
      geometry={geometry}
      material={material}
    />
  );
}