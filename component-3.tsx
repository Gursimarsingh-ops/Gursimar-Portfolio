export interface VideoCategory {
  id: string;
  label: string;
  count: number;
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { id: "gaming", label: "Gaming Video Editing", count: 4 },
  { id: "doc", label: "Documentary Editing", count: 3 },
  { id: "corp", label: "Corporate Videos", count: 3 },
  { id: "motion", label: "Motion Graphics", count: 4 },
  { id: "estate", label: "Real Estate Videos", count: 3 },
  { id: "saas", label: "SaaS Animations", count: 3 },
];