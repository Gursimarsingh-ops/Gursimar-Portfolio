// RobotScene.tsx
export interface RobotSceneProps {
  className?: string;
}
export function RobotScene(props: RobotSceneProps): JSX.Element;
// Owns <Canvas>. Maps ROBOT_VARIANTS -> <Robot>. Renders <PortraitFrame> centered.
// Renders <SceneLighting>. This is the only file Stage 4 will mount into the site.