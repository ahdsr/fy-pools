import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const crons = Array.isArray(config.crons) ? config.crons : [];

function isSingleIntegerField(value, min, max) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return parsed >= min && parsed <= max;
}

const invalidCrons = crons.filter((cron) => {
  if (!cron || typeof cron.schedule !== "string") return true;
  const fields = cron.schedule.trim().split(/\s+/);
  if (fields.length !== 5) return true;

  const [minute, hour] = fields;
  return !isSingleIntegerField(minute, 0, 59) || !isSingleIntegerField(hour, 0, 23);
});

if (invalidCrons.length > 0) {
  console.error(
    [
      "Vercel Hobby deployments only support cron schedules that run at most once per day.",
      "Use a fixed minute and fixed hour, for example: 0 8 * * *",
      `Invalid cron schedules: ${invalidCrons
        .map((cron) => `${cron.path ?? "(missing path)"} -> ${cron.schedule ?? "(missing schedule)"}`)
        .join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}
