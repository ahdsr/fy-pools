import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import type { RoundOf16ResultPayload } from "@/lib/round-of-16/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type ApiKeyResult =
  | { ok: true; keyId: string }
  | { ok: false; status: number; message: string };

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export const SCORING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const SCORING_RATE_LIMIT_MAX_REQUESTS = 20;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type HeaderReader = {
  headers: {
    get(name: string): string | null;
  };
};

const globalScope = globalThis as typeof globalThis & {
  __fyPoolsScoringRateLimit?: Map<string, RateLimitBucket>;
};

function getScoringRateLimitBuckets() {
  globalScope.__fyPoolsScoringRateLimit ??= new Map<string, RateLimitBucket>();
  return globalScope.__fyPoolsScoringRateLimit;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function stringRecord(value: unknown) {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (entries.some(([, entryValue]) => typeof entryValue !== "string")) {
    return null;
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

export function secretsMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

export function rateLimitKeyForRequest(request: HeaderReader, keyId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedIp || realIp || "unknown";

  return `${keyId}:${ip}`;
}

export function checkScoringMemoryRateLimit(
  request: HeaderReader,
  keyId: string,
): RateLimitResult {
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
    return { ok: true };
  }

  if (current.count >= SCORING_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  current.count += 1;
  return { ok: true };
}

export async function checkScoringRateLimit(
  request: NextRequest,
  keyId: string,
): Promise<RateLimitResult> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("consume_api_rate_limit", {
      p_scope: "round-of-16-scoring",
      p_bucket_key: rateLimitKeyForRequest(request, keyId),
      p_window_seconds: Math.ceil(SCORING_RATE_LIMIT_WINDOW_MS / 1000),
      p_max_requests: SCORING_RATE_LIMIT_MAX_REQUESTS,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (row?.allowed === false) {
      return {
        ok: false,
        retryAfterSeconds: Math.max(
          1,
          Number(row.retry_after_seconds ?? 1),
        ),
      };
    }

    return { ok: true };
  } catch {
    return checkScoringMemoryRateLimit(request, keyId);
  }
}

export function authorizeScoringRequest(
  request: HeaderReader,
  configuredKey = process.env.FY_POOLS_SCORING_API_KEY?.trim() ?? "",
): ApiKeyResult {
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

export function resultPayloadFromBody(
  body: unknown,
): RoundOf16ResultPayload | null {
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
