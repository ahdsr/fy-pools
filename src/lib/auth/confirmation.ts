export const PENDING_CONFIRMATION_EMAIL_COOKIE =
  "poolwaffle-pending-confirmation-email";
export const PENDING_CONFIRMATION_NEXT_COOKIE =
  "poolwaffle-pending-confirmation-next";

export const pendingConfirmationCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
