import type { NextRequest } from "next/server";

import { refreshRoundOf16ScoringForPool } from "@/lib/round-of-16/persistence";
import {
  authorizeScoringRequest,
  checkScoringRateLimit,
  resultPayloadFromBody,
  SCORING_REQUEST_MAX_BYTES,
} from "@/lib/api/scoring-api";

type ScoreRouteContext = {
  params: Promise<{ poolId: string }>;
};

export async function POST(request: NextRequest, { params }: ScoreRouteContext) {
  const authorization = authorizeScoringRequest(request);

  if (!authorization.ok) {
    return Response.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const rateLimit = await checkScoringRateLimit(request, authorization.keyId);
  if (!rateLimit.ok) {
    return Response.json(
      { error: "Too many scoring refresh requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const { poolId } = await params;
  if (!poolId) {
    return Response.json({ error: "Pool id is required." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > SCORING_REQUEST_MAX_BYTES) {
    return Response.json(
      { error: "Request body is too large." },
      { status: 413 },
    );
  }

  const body = await request.json().catch(() => null);
  const results = resultPayloadFromBody(body);

  if (!results) {
    return Response.json(
      {
        error:
          "Expected JSON body with results.winners and/or results.bonusAnswers string maps.",
      },
      { status: 400 },
    );
  }

  try {
    const rows = await refreshRoundOf16ScoringForPool({ poolId, results });

    return Response.json({
      poolId,
      calculatedAt: new Date().toISOString(),
      rows,
    });
  } catch (error) {
    console.error("[fy-pools] Round of 16 scoring refresh failed", error);

    return Response.json(
      { error: "Scoring could not be refreshed." },
      { status: 500 },
    );
  }
}
