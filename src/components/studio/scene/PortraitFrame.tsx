import { useEffect, useState } from "react";
import { ClampToEdgeWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { FRAME } from "./theme";

export interface PortraitFrameProps {
  imageUrl?: string;
}

/**
 * Chrome portrait frame suspended between the two units.
 * The photo is supplied as a URL or asset path; if it cannot be loaded the
 * frame keeps a designed placeholder plaque instead of breaking the scene.
 */
export function PortraitFrame({ imageUrl }: PortraitFrameProps) {
  const [texture, setTexture] = useState<Texture | null>(null);

  const setW = FRAME.width;
  const setH = FRAME.height;
  const border = FRAME.border;
  const depth = FRAME.depth;
  const innerW = setW - border * 2 - 0.06;
  const innerH = setH - border * 2 - 0.06;

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    let active = true;
    const loader = new TextureLoader();

    loader.load(
      imageUrl,
      (loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = SRGBColorSpace;
        loaded.anisotropy = 4;
        loaded.wrapS = loaded.wrapT = ClampToEdgeWrapping;

        // Cover-crop so the photo never stretches inside the frame.
        const image = loaded.image as { width?: number; height?: number } | undefined;
        if (image?.width && image?.height) {
          const planeAspect = innerW / innerH;
          const imageAspect = image.width / image.height;
          if (imageAspect > planeAspect) {
            const scale = planeAspect / imageAspect;
            loaded.repeat.set(scale, 1);
            loaded.offset.set((1 - scale) / 2, 0);
          } else {
            const scale = imageAspect / planeAspect;
            loaded.repeat.set(1, scale);
            loaded.offset.set(0, (1 - scale) / 2);
          }
        }

        setTexture(loaded);
      },
      undefined,
      () => {
        if (active) setTexture(null);
      }
    );

    return () => {
      active = false;
    };
  }, [imageUrl, innerW, innerH]);

  return (
    <group position={[0, FRAME.centerY, 0]}>
      {/* Backing and outer edge */}
      <mesh material-color="#0d0e12" material-metalness={0.6} material-roughness={0.45} castShadow receiveShadow>
        <boxGeometry args={[setW, setH, depth]} />
      </mesh>

      {/* Portrait plate */}
      <mesh position={[0, 0, depth / 2 + 0.001]}>
        <planeGeometry args={[innerW, innerH]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1c21" roughness={0.85} metalness={0.2} />
        )}
      </mesh>

      {/* Placeholder plaque marks, hidden once a portrait is loaded */}
      {!texture ? (
        <group position={[0, 0, depth / 2 + 0.004]}>
          <mesh>
            <planeGeometry args={[innerW * 0.34, 0.003]} />
            <meshBasicMaterial color="#4a4f58" />
          </mesh>
          <mesh>
            <planeGeometry args={[0.003, innerH * 0.3]} />
            <meshBasicMaterial color="#4a4f58" />
          </mesh>
          <mesh position={[0, -innerH / 2 + 0.16, 0.001]}>
            <planeGeometry args={[innerW * 0.5, 0.0025]} />
            <meshBasicMaterial color="#33383f" />
          </mesh>
          <mesh position={[0, -innerH / 2 + 0.12, 0.001]}>
            <planeGeometry args={[innerW * 0.26, 0.0025]} />
            <meshBasicMaterial color="#2b2f36" />
          </mesh>
        </group>
      ) : null}

      {/* Glass */}
      <mesh position={[0, 0, depth / 2 + 0.008]}>
        <planeGeometry args={[innerW, innerH]} />
        <meshStandardMaterial
          color="#c8ced8"
          metalness={0.25}
          roughness={0.06}
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Chrome border */}
      {[
        { position: [0, setH / 2 - border / 2, 0], size: [setW, border, depth * 1.15] },
        { position: [0, -setH / 2 + border / 2, 0], size: [setW, border, depth * 1.15] },
        { position: [-setW / 2 + border / 2, 0, 0], size: [border, setH - border * 2, depth * 1.15] },
        { position: [setW / 2 - border / 2, 0, 0], size: [border, setH - border * 2, depth * 1.15] },
      ].map((piece, index) => (
        <mesh
          key={index}
          position={piece.position as [number, number, number]}
          material-color="#d3d6db"
          material-metalness={0.95}
          material-roughness={0.24}
          castShadow
          receiveShadow
        >
          <boxGeometry args={piece.size as [number, number, number]} />
        </mesh>
      ))}

      {/* Grip pads where the hands bite down */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (setW / 2 + 0.012), FRAME.gripY - FRAME.centerY, 0]}
          material-color="#8f949c"
          material-metalness={0.9}
          material-roughness={0.35}
          castShadow
        >
          <boxGeometry args={[0.03, 0.42, depth * 1.2]} />
        </mesh>
      ))}

      {/* Base caption plaque */}
      <mesh position={[0, -setH / 2 - 0.05, 0]} material-color="#c9ccd1" material-metalness={0.9} material-roughness={0.3}>
        <boxGeometry args={[0.5, 0.02, depth * 0.5]} />
      </mesh>
    </group>
  );
}
