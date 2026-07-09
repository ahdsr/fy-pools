import { spawnSync } from "node:child_process";
import path from "node:path";

const command = path.join(
  process.cwd(),
  "node_modules",
  "vitest",
  "vitest.mjs",
);
const result = spawnSync(
  process.execPath,
  [command, "run", "tests/live-fifa-accuracy.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      FY_POOLS_LIVE_FIFA_AUDIT: "1",
    },
  },
);

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
