import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("local authentication configuration", () => {
  it("uses localhost port 3000 consistently", () => {
    const environmentExample = readProjectFile(".env.example");
    const supabaseConfig = readProjectFile("supabase/config.toml");

    expect(environmentExample).toContain(
      "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
    );
    expect(supabaseConfig).toContain('site_url = "http://localhost:3000"');
    expect(supabaseConfig).toContain(
      '"http://localhost:3000/auth/callback?next=**"',
    );
    expect(`${environmentExample}\n${supabaseConfig}`).not.toContain(
      "localhost:3001",
    );
  });

  it("uses clear PoolWaffle copy in local authentication emails", () => {
    const supabaseConfig = readProjectFile("supabase/config.toml");
    const confirmationTemplate = readProjectFile(
      "supabase/templates/confirmation.html",
    );
    const recoveryTemplate = readProjectFile("supabase/templates/recovery.html");

    expect(supabaseConfig).toContain(
      'subject = "Confirm your PoolWaffle account"',
    );
    expect(supabaseConfig).toContain(
      'subject = "Reset your PoolWaffle password"',
    );
    expect(confirmationTemplate).toContain("PoolWaffle account with");
    expect(confirmationTemplate).toContain("{{ .ConfirmationURL }}");
    expect(recoveryTemplate).toContain("password reset was requested");
    expect(recoveryTemplate).toContain("Your current password will not change");
  });
});
