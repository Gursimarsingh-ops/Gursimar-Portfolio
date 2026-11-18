// Robot.tsx
export interface RobotProps {
  variant: RobotVariant;
}
export function Robot(props: RobotProps): JSX.Element;
// Composes: RobotHead, RobotTorso, RobotArm x2, RobotLeg x2.
// Reads variant.proportions to position parts. No animation in Stage 3 unless approved.