export type SkillId =
  | "video"
  | "graphic"
  | "motion"
  | "color"
  | "cut"
  | "gaming"
  | "corp"
  | "estate"
  | "saas";

export interface Skill {
  id: SkillId;
  title: string;
  desc: string;
}

export const SKILLS: Skill[] = [
  { id: "video", title: "Video Editing", desc: "Narrative pacing, transitions and rhythm." },
  { id: "graphic", title: "Graphic Designing", desc: "Thumbnails, layouts and visual identity." },
  { id: "motion", title: "Motion Graphics", desc: "Animated shapes, type and kinetic motion." },
  { id: "color", title: "Color Grading", desc: "Flat footage into cinematic color." },
  { id: "cut", title: "Cutting Artist", desc: "Long-form into sharp short-form cuts." },
  { id: "gaming", title: "Gaming Content", desc: "High-energy edits and highlight reels." },
  { id: "corp", title: "Corporate Video", desc: "Clean, credible brand storytelling." },
  { id: "estate", title: "Real Estate Video", desc: "Spaces told with cinematic movement." },
  { id: "saas", title: "SaaS Animation", desc: "Product stories through motion design." },
];