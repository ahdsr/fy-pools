import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("auth entry illustrations", () => {
  it("uses local image paths without query strings", () => {
    const sources = [
      readSource("src/components/app/auth-split-layout.tsx"),
      readSource("src/components/app/sign-up-value-carousel.tsx"),
    ];

    for (const source of sources) {
      expect(source).not.toMatch(/\/illustrations\/[^"`]+\?/);
    }
  });
});
