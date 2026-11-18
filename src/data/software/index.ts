export interface Software {
  id: string;
  name: string;
  short: string;
  color: string;
  accent: string;
  tag: string;
}

export const SOFTWARE: Software[] = [
  { id: "photoshop", name: "Adobe Photoshop", short: "Ps", color: "#001e36", accent: "#31a8ff", tag: "Raster & Retouch" },
  { id: "premiere", name: "Adobe Premiere Pro", short: "Pr", color: "#00005b", accent: "#9999ff", tag: "Editing & Assembly" },
  { id: "resolve", name: "DaVinci Resolve", short: "DR", color: "#1a1a1a", accent: "#ff5c39", tag: "Color & Finishing" },
  { id: "aftereffects", name: "Adobe After Effects", short: "Ae", color: "#00005b", accent: "#d291ff", tag: "Motion & VFX" },
  { id: "canva", name: "Canva", short: "Cv", color: "#00c4cc", accent: "#7d2ae8", tag: "Quick Design" },
];