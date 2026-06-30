export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.FY_POOLS_LOCAL_RESULTS_JOB !== "1") return;

  const { startLocalResultsJob } = await import(
    "@/lib/world-cup-pool/local-results-job"
  );

  startLocalResultsJob();
}
