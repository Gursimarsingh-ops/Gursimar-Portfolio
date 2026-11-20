/**
 * How a portfolio project came to exist. Stored on the project row as one of
 * the four ids below and printed on the setup box beneath its LED screen.
 */
export const PROJECT_CLASSIFICATIONS = [
  { id: "commission", label: "Commission Based" },
  { id: "recreation", label: "Recreation" },
  { id: "non-commission", label: "Non Commission Based" },
  { id: "sample", label: "Sample" },
] as const;

export type ProjectClassification = (typeof PROJECT_CLASSIFICATIONS)[number]["id"];

/** Safe default for rows created before the field existed. */
export const DEFAULT_CLASSIFICATION: ProjectClassification = "non-commission";

export function normalizeClassification(value: unknown): ProjectClassification {
  return PROJECT_CLASSIFICATIONS.some((option) => option.id === value)
    ? (value as ProjectClassification)
    : DEFAULT_CLASSIFICATION;
}

export function classificationLabel(value: unknown): string {
  const normalized = normalizeClassification(value);
  return PROJECT_CLASSIFICATIONS.find((option) => option.id === normalized)?.label ?? "Non Commission Based";
}
