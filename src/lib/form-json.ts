export function parseJsonFormValue<T>(
  value: FormDataEntryValue | null,
  fallback: T,
  label: string,
) {
  const raw = String(value ?? "");
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} payload is not valid JSON.`);
  }
}
