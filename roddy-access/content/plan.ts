// The planning conversation. Edit questions and options here.

export type Option = { value: string; label: string };

export const planningTypes: Option[] = [
  { value: "stay", label: "Stay" },
  { value: "transport", label: "Transport" },
  { value: "dining", label: "Dining" },
  { value: "nightlife", label: "Nightlife" },
  { value: "full-weekend", label: "Full Weekend" },
  { value: "private-section", label: "Private Section" },
];

export const groupSizes: Option[] = [
  { value: "1-2", label: "Just me / two of us" },
  { value: "3-6", label: "3 – 6" },
  { value: "7-12", label: "7 – 12" },
  { value: "13-20", label: "13 – 20" },
  { value: "20+", label: "More than 20" },
];

export const occasions: Option[] = [
  { value: "birthday", label: "Birthday" },
  { value: "weekend-away", label: "Weekend Away" },
  { value: "night-out", label: "Night Out" },
  { value: "business", label: "Business" },
  { value: "celebration", label: "Celebration" },
  { value: "other", label: "Other" },
];

export const needs: Option[] = [
  { value: "accommodation", label: "Villa / Penthouse / Hotel" },
  { value: "luxury-car", label: "Luxury Car" },
  { value: "chauffeur", label: "V-Class / Chauffeur" },
  { value: "private-chef", label: "Private Chef" },
  { value: "dining", label: "Dining" },
  { value: "decor", label: "Décor" },
  { value: "drinks", label: "Drinks Setup" },
  { value: "club-table", label: "Club Table" },
  { value: "full-planning", label: "Full Weekend Planning" },
];

export const areas: Option[] = [
  { value: "sandton", label: "Sandton" },
  { value: "rosebank", label: "Rosebank" },
  { value: "hyde-park", label: "Hyde Park" },
  { value: "fourways", label: "Fourways" },
  { value: "midrand", label: "Midrand" },
  { value: "open", label: "Open to Suggestions" },
];

export const budgets: Option[] = [
  { value: "under-25k", label: "Under R25 000" },
  { value: "25-75k", label: "R25 000 – R75 000" },
  { value: "75-150k", label: "R75 000 – R150 000" },
  { value: "150-300k", label: "R150 000 – R300 000" },
  { value: "300k+", label: "R300 000+" },
  { value: "unsure", label: "Not sure yet — advise me" },
];

// Sensible starting selections when someone arrives from a specific page
export const needsForType: Record<string, string[]> = {
  stay: ["accommodation"],
  transport: ["chauffeur"],
  dining: ["dining"],
  nightlife: ["club-table"],
  "full-weekend": ["full-planning"],
  "private-section": ["accommodation", "private-chef", "drinks", "decor"],
};
