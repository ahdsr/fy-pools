import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  SCORING_RATE_LIMIT_MAX_REQUESTS,
  SCORING_RESULT_MAX_FIELDS,
  SCORING_RESULT_MAX_VALUE_LENGTH,
  authorizeScoringRequest,
  checkScoringMemoryRateLimit,
  rateLimitKeyForRequest,
  resultPayloadFromBody,
  secretsMatch,
} from "@/lib/api/scoring-api";

function request(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
  };
}

describe("scoring API security helpers", () => {
  it("accepts bearer and explicit API-key headers without prefix timing leaks", () => {
    const configuredKey = "test-secret-key";

    expect(
      authorizeScoringRequest(
        request({ authorization: `Bearer ${configuredKey}` }),
        configuredKey,
      ),
    ).toEqual({ ok: true, keyId: "test-sec" });

    expect(
      authorizeScoringRequest(
        request({ "x-fy-pools-api-key": configuredKey }),
        configuredKey,
      ),
    ).toEqual({ ok: true, keyId: "test-sec" });

    expect(secretsMatch("short", configuredKey)).toBe(false);
  });

  it("rejects missing or invalid API keys with stable status codes", () => {
    expect(authorizeScoringRequest(request({}), "")).toMatchObject({
      ok: false,
      status: 503,
    });
    expect(authorizeScoringRequest(request({ authorization: "Bearer wrong" }), "right"))
      .toMatchObject({
        ok: false,
        status: 401,
      });
  });

  it("builds rate-limit keys from forwarded client identity", () => {
    expect(
      rateLimitKeyForRequest(
        request({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" }),
        "key-id",
      ),
    ).toBe("key-id:203.0.113.8");
  });

  it("caps memory fallback requests per key and client", () => {
    const keyId = `test-${randomUUID()}`;
    const incoming = request({ "x-real-ip": "198.51.100.4" });

    for (let index = 0; index < SCORING_RATE_LIMIT_MAX_REQUESTS; index += 1) {
      expect(checkScoringMemoryRateLimit(incoming, keyId)).toEqual({ ok: true });
    }

    expect(checkScoringMemoryRateLimit(incoming, keyId)).toMatchObject({
      ok: false,
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("accepts winners or bonus answers but rejects non-string maps", () => {
    expect(
      resultPayloadFromBody({
        results: {
          winners: { match1: "Canada" },
        },
      }),
    ).toEqual({ winners: { match1: "Canada" }, bonusAnswers: {} });

    expect(resultPayloadFromBody({ winners: { match1: 1 } })).toBeNull();
  });

  it("rejects scoring payloads with excessive fields or values", () => {
    expect(
      resultPayloadFromBody({
        winners: Object.fromEntries(
          Array.from({ length: SCORING_RESULT_MAX_FIELDS + 1 }, (_, index) => [
            `match-${index}`,
            "Canada",
          ]),
        ),
      }),
    ).toBeNull();

    expect(
      resultPayloadFromBody({
        winners: {
          match1: "A".repeat(SCORING_RESULT_MAX_VALUE_LENGTH + 1),
        },
      }),
    ).toBeNull();
  });

  it("ships the durable database limiter migration", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260708003000_api_rate_limit_buckets.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.api_rate_limit_buckets");
    expect(migration).toContain("create or replace function public.consume_api_rate_limit");
    expect(migration).toContain("grant execute on function public.consume_api_rate_limit");
    expect(migration).toContain("to service_role");
  });
});
