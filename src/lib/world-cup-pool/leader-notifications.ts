import "server-only";

import { getAppSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { PoolScore } from "@/lib/world-cup-pool/types";

type LeaderNotificationCandidate = {
  id: string;
  name: string;
  rank: number;
  score: Pick<PoolScore, "total">;
};

type SendLeaderNotificationInput = {
  poolSlug: string;
  poolName: string;
  sourceSignature: string;
  previousRows: LeaderNotificationCandidate[];
  currentRows: LeaderNotificationCandidate[];
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function configuredRecipient() {
  return process.env.FY_POOLS_LEADER_NOTIFICATION_TEST_EMAIL?.trim() ?? "";
}

function configuredSender() {
  return process.env.FY_POOLS_EMAIL_FROM?.trim() ?? "";
}

function candidateLeaders({ previousRows, currentRows }: SendLeaderNotificationInput) {
  const previousRanks = new Map(previousRows.map((row) => [row.id, row.rank]));

  return currentRows.filter(
    (row) => row.rank === 1 && previousRanks.get(row.id) !== 1,
  );
}

async function claimDelivery({
  poolSlug,
  sourceSignature,
  leader,
  recipient,
}: {
  poolSlug: string;
  sourceSignature: string;
  leader: LeaderNotificationCandidate;
  recipient: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_public_pool_leader_notification", {
    p_pool_slug: poolSlug,
    p_entry_id: leader.id,
    p_source_signature: sourceSignature,
    p_leader_name: leader.name,
    p_leader_score: leader.score.total,
    p_recipient: recipient,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row?.claimed === true;
}

async function recordDelivery({
  poolSlug,
  sourceSignature,
  leaderId,
  status,
  providerMessageId,
  error,
}: {
  poolSlug: string;
  sourceSignature: string;
  leaderId: string;
  status: "sent" | "failed";
  providerMessageId?: string;
  error?: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("public_pool_leader_notification_deliveries")
    .update({
      delivery_status: status,
      provider_message_id: providerMessageId ?? null,
      last_error: error ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("pool_slug", poolSlug)
    .eq("entry_id", leaderId)
    .eq("source_signature", sourceSignature);

  if (updateError) throw new Error(updateError.message);
}

async function sendWithResend({
  recipient,
  sender,
  poolSlug,
  poolName,
  leader,
}: {
  recipient: string;
  sender: string;
  poolSlug: string;
  poolName: string;
  leader: LeaderNotificationCandidate;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `You're leading ${poolName}`,
      text: `${leader.name}, you're now leading ${poolName} with ${leader.score.total} points.\n\nView the leaderboard: ${getAppSiteUrl()}/pools/${poolSlug}/leaderboard`,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? payload.name ?? `Resend request failed: ${response.status}`);
  }

  return payload.id;
}

export async function notifyNewPublicPoolLeaders(input: SendLeaderNotificationInput) {
  const leaders = candidateLeaders(input);
  const recipient = configuredRecipient();
  const sender = configuredSender();

  if (!leaders.length) return { attempted: 0, sent: 0, skipped: "no-new-leader" as const };
  if (!isSupabaseConfigured()) {
    console.warn("[fy-pools] Leader notification skipped: Supabase is not configured.");
    return { attempted: 0, sent: 0, skipped: "no-supabase" as const };
  }
  if (!process.env.RESEND_API_KEY || !sender || !recipient) {
    console.warn(
      "[fy-pools] Leader notification skipped: RESEND_API_KEY, FY_POOLS_EMAIL_FROM, and FY_POOLS_LEADER_NOTIFICATION_TEST_EMAIL are required.",
    );
    return { attempted: 0, sent: 0, skipped: "email-not-configured" as const };
  }

  let attempted = 0;
  let sent = 0;

  for (const leader of leaders) {
    const claimed = await claimDelivery({
      poolSlug: input.poolSlug,
      sourceSignature: input.sourceSignature,
      leader,
      recipient,
    });
    if (!claimed) continue;

    attempted += 1;
    try {
      const providerMessageId = await sendWithResend({
        recipient,
        sender,
        poolSlug: input.poolSlug,
        poolName: input.poolName,
        leader,
      });
      await recordDelivery({
        poolSlug: input.poolSlug,
        sourceSignature: input.sourceSignature,
        leaderId: leader.id,
        status: "sent",
        providerMessageId,
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[fy-pools] Leader notification delivery failed", error);
      await recordDelivery({
        poolSlug: input.poolSlug,
        sourceSignature: input.sourceSignature,
        leaderId: leader.id,
        status: "failed",
        error: message,
      });
    }
  }

  return { attempted, sent, skipped: null };
}
