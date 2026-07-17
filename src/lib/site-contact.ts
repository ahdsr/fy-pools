export const SUPPORT_EMAIL = "lucas.czuchraj@gmail.com";

export const LEGAL_EFFECTIVE_DATE = "July 17, 2026";

export function supportMailto({
  subject = "PoolWaffle support",
  body,
}: {
  subject?: string;
  body?: string;
} = {}) {
  const searchParams = new URLSearchParams({ subject });

  if (body) searchParams.set("body", body);

  return `mailto:${SUPPORT_EMAIL}?${searchParams.toString()}`;
}

export function earlyAccessMailto(feature: string) {
  return supportMailto({
    subject: `PoolWaffle early access: ${feature}`,
    body: [
      "Hi PoolWaffle,",
      "",
      `I'd like early access to ${feature}.`,
      "",
      "My name:",
      "My group or pool:",
      "What I want to run:",
    ].join("\n"),
  });
}
