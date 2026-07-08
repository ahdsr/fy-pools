const DEFAULT_MAX_JSON_FORM_VALUE_LENGTH = 64 * 1024;

export function parseJsonFormValue<T>(
  value: FormDataEntryValue | null,
  fallback: T,
  label: string,
  options: { maxLength?: number } = {},
) {
  const maxLength = options.maxLength ?? DEFAULT_MAX_JSON_FORM_VALUE_LENGTH;
  const raw = String(value ?? "");
  if (!raw) return fallback;
  if (raw.length > maxLength) {
    throw new Error(`${label} payload is too large.`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} payload is not valid JSON.`);
  }
}
