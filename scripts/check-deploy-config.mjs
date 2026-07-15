import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const crons = Array.isArray(config.crons) ? config.crons : [];
const workflow = await readFile(
  new URL("../.github/workflows/world-cup-results-refresh.yml", import.meta.url),
  "utf8",
);
const WORLD_CUP_REFRESH_SCHEDULE = "3-58/5 * * * *";

if (crons.length > 0) {
  console.error(
    [
      "Vercel Hobby cannot run the required five-minute World Cup refresh.",
      "Use the GitHub Actions scheduler instead of a Vercel cron entry.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!workflow.includes(`cron: "${WORLD_CUP_REFRESH_SCHEDULE}"`)) {
  console.error(
    `World Cup results must refresh every five minutes: ${WORLD_CUP_REFRESH_SCHEDULE}.`,
  );
  process.exit(1);
}
