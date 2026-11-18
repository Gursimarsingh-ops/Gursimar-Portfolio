export interface GraphicCategory {
  id: string;
  label: string;
  count: number;
  ratio: string;
}

export const GRAPHIC_CATEGORIES: GraphicCategory[] = [
  { id: "irl", label: "IRL Thumbnails", count: 6, ratio: "16/9" },
  { id: "gaming", label: "Gaming Thumbnails", count: 6, ratio: "16/9" },
  { id: "doc", label: "Documentary Thumbnails", count: 4, ratio: "16/9" },
  { id: "other", label: "Other Graphic Design", count: 4, ratio: "4/5" },
];