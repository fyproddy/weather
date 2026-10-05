/** Google Ads keyword syntax: [exact], "phrase", broad. */
export function formatKeyword(text: string, matchType?: string) {
  return matchType === "exact" ? `[${text}]` : matchType === "phrase" ? `"${text}"` : text;
}
