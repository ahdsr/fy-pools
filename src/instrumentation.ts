export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { startLocalResultsJob } = await import(
    "@/lib/world-cup-pool/local-results-job"
  );

  startLocalResultsJob();
}
