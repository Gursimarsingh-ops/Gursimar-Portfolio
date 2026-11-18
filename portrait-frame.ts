// PortraitFrame.tsx
export interface PortraitFrameProps {
  imageUrl?: string;   // placeholder when absent
  label?: string;
}
export function PortraitFrame(_props: PortraitFrameProps): null {
  return null;
}
// Reads FRAME from sceneConfig. Renders frame border + placeholder panel.
// Exposes named groups `frame-grip-left` / `frame-grip-right` as future hand targets.