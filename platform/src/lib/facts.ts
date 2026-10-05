export const FACT_CATEGORIES = [
  ["service", "Service"],
  ["price", "Price"],
  ["guarantee", "Guarantee / warranty"],
  ["certification", "Certification"],
  ["award", "Award"],
  ["location", "Service area"],
  ["claim", "Other claim"],
  ["other", "Other"],
] as const;

export const FACT_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(FACT_CATEGORIES);
