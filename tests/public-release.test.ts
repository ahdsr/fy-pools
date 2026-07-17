import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import {
  LEGAL_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
  earlyAccessMailto,
  supportMailto,
} from "@/lib/site-contact";

const projectRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("closed-beta public release layer", () => {
  it("centralizes the published support inbox and early-access mailto links", () => {
    expect(SUPPORT_EMAIL).toBe("lucas.czuchraj@gmail.com");
    expect(LEGAL_EFFECTIVE_DATE).toBe("July 17, 2026");
    expect(supportMailto()).toBe(
      "mailto:lucas.czuchraj@gmail.com?subject=PoolWaffle+support",
    );
    expect(earlyAccessMailto("spreadsheet conversion")).toContain(
      "mailto:lucas.czuchraj@gmail.com?subject=PoolWaffle+early+access%3A+spreadsheet+conversion",
    );
  });

  it("publishes the legal, contact, and signup-agreement surfaces", () => {
    const sources = [
      readSource("src/app/privacy/page.tsx"),
      readSource("src/app/terms/page.tsx"),
      readSource("src/app/contact/page.tsx"),
      readSource("src/app/support/data-sources/page.tsx"),
      readSource("src/components/app/mock-auth.tsx"),
      readSource("src/components/app/site-footer.tsx"),
    ].join("\n");

    expect(sources).toContain("Privacy Notice");
    expect(sources).toContain("Terms of Use");
    expect(sources).toContain("Contact PoolWaffle");
    expect(sources).toContain("Sports data sources");
    expect(sources).toContain("By continuing with Google or creating an account");
    expect(sources).toContain('href="/privacy"');
    expect(sources).toContain('href="/terms"');
  });

  it("keeps live templates actionable and routes future work to early access", () => {
    const library = readSource("src/components/app/template-library.tsx");
    const spreadsheet = readSource("src/app/upload-your-own/page.tsx");

    expect(library).toContain("Start with template");
    expect(library).toContain("Request early access");
    expect(library).toContain("earlyAccessMailto(template.name)");
    expect(spreadsheet).toContain("Spreadsheet conversion is not self-serve yet.");
    expect(spreadsheet).toContain('earlyAccessMailto("spreadsheet conversion")');
  });

  it("indexes every public release page without exposing private routes", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://fy-pools.vercel.app/templates",
        "https://fy-pools.vercel.app/upload-your-own",
        "https://fy-pools.vercel.app/contact",
        "https://fy-pools.vercel.app/privacy",
        "https://fy-pools.vercel.app/terms",
        "https://fy-pools.vercel.app/support/data-sources",
      ]),
    );
    expect(urls.some((url) => url.includes("/dashboard"))).toBe(false);
    expect(urls.some((url) => url.includes("/join"))).toBe(false);
  });
});
