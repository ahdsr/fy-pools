import { describe, expect, it } from "vitest";

import { authUserFromSupabase } from "@/lib/auth/user";

describe("auth user projection", () => {
  it("uses the provider display name before the email fallback", () => {
    expect(
      authUserFromSupabase({
        email: "alex@example.com",
        user_metadata: { full_name: "Alex Pooler" },
      }),
    ).toEqual({
      name: "Alex Pooler",
      email: "alex@example.com",
      role: "Pool user",
    });
  });

  it("supports password and provider users without a display name", () => {
    expect(authUserFromSupabase({ email: "alex@example.com" })).toEqual({
      name: "alex",
      email: "alex@example.com",
      role: "Pool user",
    });
  });
});
