import { GRAPHIC_CATEGORIES } from "@/data/graphic-design";
import { VIDEO_CATEGORIES } from "@/data/video-editing";

export const CATEGORY_OPTIONS = {
  graphic: GRAPHIC_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  video: VIDEO_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
};

export function categoryLabel(kind: "graphic" | "video", id: string): string {
  return CATEGORY_OPTIONS[kind].find((c) => c.id === id)?.label ?? id;
}
