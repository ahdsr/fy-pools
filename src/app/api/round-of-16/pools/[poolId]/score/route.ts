import type { NextRequest } from "next/server";

import { refreshRoundOf16ScoringForPool } from "@/lib/round-of-16/persistence";
import type { RoundOf16ResultPayload } from "@/lib/round-of-16/scoring";

export const dynamic = "force-dynamic";

type ScoreRouteContext = {
  params: Promise<{ poolId: string }>;
};

type ApiKeyResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringRecord(value: unknown) {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (entries.some(([, entryValue]) => typeof entryValue !== "string")) {
    return null;
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

function authorizeScoringRequest(request: NextRequest): ApiKeyResult {
  const configuredKey = process.env.FY_POOLS_SCORING_API_KEY?.trim();

  if (!configuredKey) {
    return {
      ok: false,
      status: 503,
      message: "Scoring API key is not configured.",
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";
  const headerKey = request.headers.get("x-fy-pools-api-key")?.trim() ?? "";

  if (bearerToken === configuredKey || headerKey === configuredKey) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 401,
    message: "Invalid scoring API key.",
  };
}

function resultPayloadFromBody(body: unknown): RoundOf16ResultPayload | null {
  if (!isRecord(body)) return null;

  const source = isRecord(body.results) ? body.results : body;
  const winners = stringRecord(source.winners);
  const bonusAnswers = stringRecord(source.bonusAnswers);

  if (!winners && !bonusAnswers) return null;

  return {
    winners: winners ?? {},
    bonusAnswers: bonusAnswers ?? {},
  };
}

export async function POST(request: NextRequest, { params }: ScoreRouteContext) {
  const authorization = authorizeScoringRequest(request);

  if (!authorization.ok) {
    return Response.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { poolId } = await params;
  if (!poolId) {
    return Response.json({ error: "Pool id is required." }, { status: 400 });
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
    const message =
      error instanceof Error ? error.message : "Scoring could not be refreshed.";

    return Response.json({ error: message }, { status: 500 });
  }
}
