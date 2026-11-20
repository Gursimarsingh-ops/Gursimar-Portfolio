export interface GraphicCategory {
  id: string;
  label: string;
  count: number;
  ratio: string;
}

/**
 * 26 documented graphic design projects, grouped by the existing categories.
 * Totals: 8 thumbnails + 8 IRL + 5 documentary + 5 other = 26.
 *
 * The order below is the published order everywhere the categories appear
 * (public tabs, admin filters and upload selectors). Category ids are stable so
 * every project keeps its existing assignment; only the label and order changed.
 */
export const GRAPHIC_CATEGORIES: GraphicCategory[] = [
  { id: "gaming", label: "Thumbnails", count: 8, ratio: "16/9" },
  { id: "irl", label: "IRL Thumbnails", count: 8, ratio: "16/9" },
  { id: "doc", label: "Documentary Thumbnails", count: 5, ratio: "16/9" },
  { id: "other", label: "Other Graphic Design", count: 5, ratio: "4/5" },
];

export const GRAPHIC_PROJECT_TOTAL = GRAPHIC_CATEGORIES.reduce(
  (total, category) => total + category.count,
  0
);
