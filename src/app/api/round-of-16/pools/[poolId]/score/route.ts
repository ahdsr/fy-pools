import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { refreshRoundOf16ScoringForPool } from "@/lib/round-of-16/persistence";
import type { RoundOf16ResultPayload } from "@/lib/round-of-16/scoring";

export const dynamic = "force-dynamic";

type ScoreRouteContext = {
  params: Promise<{ poolId: string }>;
};

type ApiKeyResult =
  | { ok: true; keyId: string }
  | { ok: false; status: number; message: string };

const SCORING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SCORING_RATE_LIMIT_MAX_REQUESTS = 20;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalScope = globalThis as typeof globalThis & {
  __fyPoolsScoringRateLimit?: Map<string, RateLimitBucket>;
};

function getScoringRateLimitBuckets() {
  globalScope.__fyPoolsScoringRateLimit ??= new Map<string, RateLimitBucket>();
  return globalScope.__fyPoolsScoringRateLimit;
}

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

function secretsMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

function rateLimitKeyForRequest(request: NextRequest, keyId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedIp || realIp || "unknown";

  return `${keyId}:${ip}`;
}

function checkScoringRateLimit(request: NextRequest, keyId: string) {
  const now = Date.now();
  const buckets = getScoringRateLimitBuckets();

  for (const [storedKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(storedKey);
  }

  const bucketKey = rateLimitKeyForRequest(request, keyId);
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + SCORING_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true as const };
  }

  if (current.count >= SCORING_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true as const };
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

  if (
    secretsMatch(bearerToken, configuredKey) ||
    secretsMatch(headerKey, configuredKey)
  ) {
    return { ok: true, keyId: configuredKey.slice(0, 8) };
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

  const rateLimit = checkScoringRateLimit(request, authorization.keyId);
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
