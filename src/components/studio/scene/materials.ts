import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
import type { RobotTheme } from "./theme";

export interface RobotMaterials {
  shell: MeshStandardMaterial;
  shellDark: MeshStandardMaterial;
  panel: MeshStandardMaterial;
  joint: MeshStandardMaterial;
  chrome: MeshStandardMaterial;
  eye: MeshStandardMaterial;
  mouth: MeshStandardMaterial;
  thruster: MeshStandardMaterial;
}

/** Per-robot material set. Neutral shells, restrained glow — no colour noise. */
export function useRobotMaterials(robot: RobotTheme): RobotMaterials {
  const materials = useMemo<RobotMaterials>(() => {
    const metal = (color: string, metalness: number, roughness: number) =>
      new MeshStandardMaterial({ color, metalness, roughness });

    return {
      shell: metal(robot.shell, 0.5, robot.id === "b" ? 0.52 : 0.36),
      shellDark: metal(robot.shellDark, 0.65, 0.4),
      panel: metal(robot.panel, 0.35, 0.62),
      joint: metal(robot.joint, 0.85, 0.3),
      chrome: new MeshStandardMaterial({ color: robot.chrome, metalness: 1, roughness: 0.18 }),
      eye: new MeshStandardMaterial({
        color: robot.eye,
        emissive: robot.eye,
        emissiveIntensity: robot.eyeGlow,
        metalness: 0,
        roughness: 0.2,
        toneMapped: false,
      }),
      mouth: new MeshStandardMaterial({
        color: robot.mouth,
        emissive: robot.mouth,
        emissiveIntensity: Math.max(1.1, robot.eyeGlow * 0.8),
        metalness: 0,
        roughness: 0.3,
        toneMapped: false,
      }),
      thruster: new MeshStandardMaterial({
        color: robot.thruster,
        emissive: robot.thruster,
        emissiveIntensity: 2,
        metalness: 0,
        roughness: 0.4,
        transparent: true,
        opacity: 0.62,
        toneMapped: false,
      }),
    };
  }, [robot]);

  useEffect(() => {
    return () => {
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [materials]);

  return materials;
}
