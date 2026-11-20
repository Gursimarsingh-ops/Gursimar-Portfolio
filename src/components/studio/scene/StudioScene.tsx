import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, type Group, type PerspectiveCamera } from "three";
import { RIG, ROBOTS } from "./theme";
import { StudioRobot } from "./StudioRobot";
import { PortraitFrame } from "./PortraitFrame";
import { StudioLamps } from "./StudioLamps";

export interface StudioSceneProps {
  /** Portrait URL or asset path (e.g. "/portrait.jpg"). */
  portraitSrc?: string;
  className?: string;
}

const CAMERA_FOV = 38;
const MIN_CAMERA_Z = 6.4;
/** Half-width the composition needs in view: frame, both units and margin. */
const REQUIRED_HALF_WIDTH = 2.7;

/** Keeps the full pair in frame on phones without cropping hands. */
function CameraFit() {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.45);
    const halfHeight = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const z = Math.max(MIN_CAMERA_Z, REQUIRED_HALF_WIDTH / (halfHeight * aspect));

    cam.fov = CAMERA_FOV;
    cam.position.set(0, 0.55, z);
    cam.lookAt(0, 0.1, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

function Lights({ lowPower = false }: { lowPower?: boolean }) {
  return (
    <group>
      <ambientLight intensity={0.3} color="#cfd3da" />
      <hemisphereLight intensity={0.42} color="#e9edf4" groundColor="#0b0c10" />

      {/* Key light, camera left, casts the main shadow */}
      <spotLight
        position={[2.8, 4.8, 3.4]}
        angle={0.55}
        penumbra={0.9}
        intensity={52}
        distance={16}
        decay={2}
        color="#ffffff"
        castShadow={!lowPower}
        shadow-mapSize-width={lowPower ? 512 : 1024}
        shadow-mapSize-height={lowPower ? 512 : 1024}
        shadow-bias={-0.0007}
      />

      {/* Cool rim from behind right, warm rim from behind left */}
      <spotLight position={[-3.6, 2.4, -2.6]} angle={0.8} penumbra={1} intensity={30} distance={13} decay={2} color="#dfe8f5" />
      <spotLight position={[3.9, 2.1, -2.4]} angle={0.8} penumbra={1} intensity={42} distance={13} decay={2} color="#f7f0e5" />
      <spotLight position={[0, 1.6, 4.2]} angle={0.9} penumbra={1} intensity={10} distance={10} decay={2} color="#e6ebf3" />

      <directionalLight position={[0, 3.2, 5.5]} intensity={0.55} color="#ffffff" />
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, RIG.groundY, -0.4]} receiveShadow>
      <planeGeometry args={[18, 16]} />
      <meshStandardMaterial color="#191d24" roughness={0.9} metalness={0.2} />
    </mesh>
  );
}

/** Paint a soft radial falloff once and reuse it for every contact shadow. */
function useShadowTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(0,0,0,0.62)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.32)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return new CanvasTexture(canvas);
  }, []);
}

function ContactShadow({ x, z, width, depth }: { x: number; z: number; width: number; depth: number }) {
  const texture = useShadowTexture();
  return (
    <mesh position={[x, RIG.groundY + 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

/**
 * The whole composition floats as one rigid body, so the grip between hands
 * and frame can never drift apart while the pair hovers.
 */
function FloatingStage({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    const g = group.current;
    if (!g) return;

    const t = clock.elapsedTime;
    const motion = reduced.current ? 0 : 1;

    g.position.y = Math.sin(t * 0.9) * 0.035 * motion;
    g.rotation.z = Math.sin(t * 0.55) * 0.006 * motion;

    const targetYaw = pointer.x * 0.16 * motion;
    const targetPitch = -pointer.y * 0.05 * motion;
    const ease = Math.min(delta * 3, 1);

    g.rotation.y += (targetYaw - g.rotation.y) * ease;
    g.rotation.x += (targetPitch - g.rotation.x) * ease;
  });

  return <group ref={group}>{children}</group>;
}

/** Keeps mobile GPUs on a lighter budget: no shadows, capped device pixel ratio. */
function useIsWideViewport() {
  const [wide, setWide] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return wide;
}

/** Stops the render loop while the scene is scrolled out of view. */
function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setOnScreen(entry.isIntersecting)),
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, onScreen };
}

export function StudioScene({ portraitSrc, className }: StudioSceneProps) {
  const wide = useIsWideViewport();
  const { ref, onScreen } = useOnScreen<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        shadows={wide}
        dpr={wide ? [1, 1.8] : [1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 60, position: [0, 0.55, MIN_CAMERA_Z] }}
      >
        <fog attach="fog" args={["#090b0e", 7.5, 15]} />
        <CameraFit />
        <Lights lowPower={!wide} />
        <StudioLamps />
        <FloatingStage>
          <PortraitFrame imageUrl={portraitSrc} />
          {ROBOTS.map((robot) => (
            <StudioRobot key={robot.id} robot={robot} />
          ))}
        </FloatingStage>
        <Floor />
        <ContactShadow x={ROBOTS[0].root[0]} z={0.05} width={1.9} depth={1.5} />
        <ContactShadow x={ROBOTS[1].root[0]} z={0.05} width={1.9} depth={1.5} />
        <ContactShadow x={0} z={-0.1} width={2.9} depth={1.4} />
      </Canvas>
    </div>
  );
}
