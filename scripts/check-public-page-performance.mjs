const baseUrl = process.env.FY_POOLS_PERF_BASE_URL ?? "http://127.0.0.1:3000";
const shellBudgetMs = Number(process.env.FY_POOLS_SHELL_BUDGET_MS ?? 2000);
const defaultRoutes = [
  "/pools/marcins-2026-world-cup-pool",
  "/pools/marcins-2026-world-cup-pool/leaderboard",
  "/pools/marcins-2026-world-cup-pool/bracket",
  "/pools/marcins-2026-world-cup-pool/entry/lucas-czuchraj",
  "/pools/marcins-2026-world-cup-pool/projections",
];
const routes = (process.env.FY_POOLS_PERF_ROUTES ?? "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
if (routes.length === 0) routes.push(...defaultRoutes);

let failed = false;

for (const route of routes) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${route}`, {
    headers: {
      "accept-encoding": "identity",
    },
  });
  const headersAt = performance.now();
  await response.text();
  const finishedAt = performance.now();
  const shellMs = Math.round(headersAt - startedAt);
  const fullMs = Math.round(finishedAt - startedAt);
  const status = response.ok ? "ok" : "fail";

  if (!response.ok || shellMs > shellBudgetMs) {
    failed = true;
  }

  console.log(
    `${status} ${route} status=${response.status} shell=${shellMs}ms full=${fullMs}ms`,
  );
}

if (failed) {
  console.error(`Public page shell budget exceeded (${shellBudgetMs}ms).`);
  process.exitCode = 1;
}
