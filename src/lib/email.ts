export function normalizeEmailAddress(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}
