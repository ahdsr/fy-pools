export const AUTH_MESSAGES = {
  confirmationResent:
    "If this account is waiting for confirmation, we sent a new link. Check your inbox and spam folder in a few minutes.",
  passwordResetSent:
    "If an account exists for that email, a password reset link has been sent.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
  signInInvalid:
    "We couldn't sign you in with those details. Check your email and password, then try again.",
  signInUnavailable: "Sign in is not available right now. Please try again shortly.",
  signUpUnavailable:
    "We couldn't create your account right now. Please try again shortly.",
  confirmEmail:
    "Please confirm your email before signing in. Check your inbox for the confirmation email.",
  chooseDifferentPassword:
    "Choose a new password that is different from your current password.",
  chooseStrongerPassword:
    "Choose a stronger password with at least 8 characters.",
  passwordUpdateUnavailable:
    "We couldn't update your password. Request a new reset link and try again.",
} as const;

type AuthActionName =
  | "sign-in"
  | "sign-up"
  | "password-reset"
  | "password-update"
  | "confirmation-resend";

function authErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export function logAuthActionFailure(action: AuthActionName, error: unknown) {
  // Server Actions serialize their return value to the browser. Keep the
  // provider's full error on the server, where it is available to diagnostics.
  console.error(`[auth] ${action} failed`, {
    code: authErrorCode(error),
    error,
  });
}

export function messageForAuthActionFailure(
  action: AuthActionName,
  error: unknown,
) {
  const code = authErrorCode(error);

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "over_sms_send_rate_limit"
  ) {
    return AUTH_MESSAGES.rateLimited;
  }

  if (action === "sign-in") {
    if (code === "email_not_confirmed") {
      return AUTH_MESSAGES.confirmEmail;
    }

    if (code === "invalid_credentials" || code === "user_not_found") {
      return AUTH_MESSAGES.signInInvalid;
    }

    return AUTH_MESSAGES.signInUnavailable;
  }

  if (action === "sign-up") {
    if (code === "weak_password") {
      return AUTH_MESSAGES.chooseStrongerPassword;
    }

    return AUTH_MESSAGES.signUpUnavailable;
  }

  if (action === "password-update") {
    if (code === "same_password") {
      return AUTH_MESSAGES.chooseDifferentPassword;
    }

    if (code === "weak_password") {
      return AUTH_MESSAGES.chooseStrongerPassword;
    }

    return AUTH_MESSAGES.passwordUpdateUnavailable;
  }

  return AUTH_MESSAGES.passwordResetSent;
}
