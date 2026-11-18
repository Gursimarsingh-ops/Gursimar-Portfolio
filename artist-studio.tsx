import { Canvas } from "@react-three/fiber";
import { ArtistRobot } from "./robot/ArtistRobot";
import { PortraitFrame } from "./frame/PortraitFrame";
import { StudioEnvironment } from "./studio/StudioEnvironment";

export interface ArtistStudioProps {
  /** Path to your photograph. Optional — a placeholder renders if absent. */
  portraitUrl?: string;
  className?: string;
}

const ACCENT_LEFT = "#22d3ee";
const ACCENT_RIGHT = "#f59e0b";

const FRAME_WIDTH = 2.4;
const FRAME_HEIGHT = 3.0;

/**
 * Studio One — The Artist.
 * Two procedural robots hold a central portrait frame inside a lit studio.
 * Mount this wherever the previous Studio One section lived.
 */
export function ArtistStudio({ portraitUrl, className }: ArtistStudioProps) {
  const gripLeft: [number, number, number] = [-FRAME_WIDTH / 2 - 0.02, 0, 0];
  const gripRight: [number, number, number] = [FRAME_WIDTH / 2 + 0.02, 0, 0];

  return (
    <section
      className={className}
      style={{ width: "100%", height: "100%", background: "#07090c" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.8, 9], fov: 42, near: 0.1, far: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#07090c"]} />
        <fog attach="fog" args={["#07090c", 12, 26]} />

        <StudioEnvironment accentLeft={ACCENT_LEFT} accentRight={ACCENT_RIGHT} />

        <PortraitFrame
          imageUrl={portraitUrl}
          width={FRAME_WIDTH}
          height={FRAME_HEIGHT}
          accent={ACCENT_LEFT}
        />

        {/* Left robot grips with its RIGHT hand. */}
        <ArtistRobot
          side="left"
          accent={ACCENT_LEFT}
          position={[-3.6, -0.4, 0]}
          gripTarget={gripLeft}
          gripHand="right"
          twinThrusters={false}
          phase={0}
        />

        {/* Right robot grips with its LEFT hand. */}
        <ArtistRobot
          side="right"
          accent={ACCENT_RIGHT}
          position={[3.6, -0.4, 0]}
          gripTarget={gripRight}
          gripHand="left"
          twinThrusters
          phase={1.7}
        />
      </Canvas>
    </section>
  );
}

export default ArtistStudio;