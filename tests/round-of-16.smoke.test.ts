import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { scoreRoundOf16Entry } from "@/lib/round-of-16/scoring";
import { pickPayloadAndItemIdsFromItems } from "@/lib/round-of-16/persistence";
import {
  createDefaultRoundOf16WizardState,
  getEnabledRoundOf16BonusProps,
  getKnockoutPoolStageDetails,
  isRoundOf16WizardStateComplete,
  QUARTER_FINAL_TEMPLATE_SLUG,
  SEMI_FINAL_TEMPLATE_SLUG,
  toRoundOf16PoolSettings,
  validateRoundOf16InviteInputs,
  validateRoundOf16PoolSettings,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";

function createLaunchReadySettings() {
  const state = createDefaultRoundOf16WizardState();
  state.basics.poolName = "Launch Smoke Pool";
  state.basics.commissionerName = "Commissioner";
  state.basics.picksLockAt = "2099-07-04T12:00";
  state.scoring.prizePoolLabel = "$100";
  state.payouts = [
    { id: "payout-1", place: "1st Place", amount: "$70" },
    { id: "payout-2", place: "2nd Place", amount: "$20" },
    { id: "payout-3", place: "3rd Place", amount: "$10" },
  ];
  state.inviteSettings.expectedEntries = 2;
  state.inviteSettings.participants = [
    {
      id: "participant-1",
      email: "alice@example.com",
      displayName: "Alice",
    },
    {
      id: "participant-2",
      email: "bob@example.com",
      displayName: "Bob",
    },
  ];

  return {
    state,
    settings: toRoundOf16PoolSettings(state),
  };
}

function completePickPayload(
  settings: RoundOf16PoolSettings,
  winnerSide: "teamOne" | "teamTwo",
): RoundOf16PickPayload {
  return {
    winners: Object.fromEntries(
      settings.matchups.map((matchup) => [
        matchup.id,
        winnerSide === "teamOne" ? matchup.teamOne : matchup.teamTwo,
      ]),
    ),
    bonusAnswers: Object.fromEntries(
      getEnabledRoundOf16BonusProps(settings).map((prop) => {
        if (prop.id === "penalty-decisions") return [prop.id, "2"];
        if (prop.id === "total-goals") return [prop.id, "24"];
        return [prop.id, settings.matchups[0].teamOne];
      }),
    ),
  };
}

describe("Round of 16 launch smoke coverage", () => {
  it("supports the remaining quarter-final slate with quarter-final pick keys", () => {
    const state = createDefaultRoundOf16WizardState(
      QUARTER_FINAL_TEMPLATE_SLUG,
    );
    state.basics.commissionerName = "Commissioner";
    state.basics.picksLockAt = "2099-07-10T15:00";
    state.scoring.prizePoolLabel = "$30";
    state.payouts = [
      { id: "payout-1", place: "1st Place", amount: "$30" },
    ];
    const settings = toRoundOf16PoolSettings(state);
    const picks = completePickPayload(settings, "teamOne");
    const score = scoreRoundOf16Entry({ settings, picks, results: picks });
    const { itemIds } = pickPayloadAndItemIdsFromItems({
      settings,
      items: [
        {
          id: "pick-item-quarter-final-1",
          value: {
            matchupId: settings.matchups[0].id,
            winner: settings.matchups[0].teamOne,
          },
        },
      ],
    });

    expect(getKnockoutPoolStageDetails(settings).label).toBe("Quarter-final");
    expect(settings.matchups.map((matchup) => matchup.id)).toEqual([
      "qf-2",
      "qf-3",
      "qf-4",
    ]);
    expect(validateRoundOf16PoolSettings(settings)).toBeNull();
    expect(score.lines[0]?.key).toBe("qf_1_winner");
    expect(itemIds.get("qf_1_winner")).toBe("pick-item-quarter-final-1");
  });

  it("opens a semifinal template with the correct quarter-final bracket paths", () => {
    const state = createDefaultRoundOf16WizardState(SEMI_FINAL_TEMPLATE_SLUG);
    state.basics.commissionerName = "Commissioner";
    state.basics.picksLockAt = "2099-07-14T15:00";
    state.scoring.prizePoolLabel = "$20";
    state.payouts = [
      { id: "payout-1", place: "1st Place", amount: "$20" },
    ];
    const settings = toRoundOf16PoolSettings(state);

    expect(getKnockoutPoolStageDetails(settings).label).toBe("Semi-final");
    expect(settings.basics.picksLockAt).toBe("2099-07-14T15:00");
    expect(settings.matchups).toMatchObject([
      {
        teamOne: "Winner of France vs Morocco",
        teamTwo: "Winner of Spain vs Belgium",
      },
      {
        teamOne: "Winner of Norway vs England",
        teamTwo: "Winner of Argentina vs Switzerland",
      },
    ]);
    expect(validateRoundOf16PoolSettings(settings)).toBeNull();
  });

  it("keeps the default launch wizard state publishable after required fields are filled", () => {
    const { state, settings } = createLaunchReadySettings();

    expect(validateRoundOf16PoolSettings(settings)).toBeNull();
    expect(validateRoundOf16InviteInputs(state.inviteSettings.participants)).toBeNull();
    expect(isRoundOf16WizardStateComplete(state)).toBe(true);
  });

  it("rejects duplicate participant emails and duplicate matchup teams before publish", () => {
    const { state, settings } = createLaunchReadySettings();
    const duplicateTeamSettings = {
      ...settings,
      matchups: settings.matchups.map((matchup, index) =>
        index === 1 ? { ...matchup, teamOne: settings.matchups[0].teamOne } : matchup,
      ),
    };

    expect(validateRoundOf16PoolSettings(duplicateTeamSettings)).toBe(
      "Each Round of 16 team can appear only once.",
    );
    expect(
      validateRoundOf16InviteInputs([
        ...state.inviteSettings.participants,
        {
          id: "participant-3",
          email: "ALICE@example.com",
          displayName: "Alice Duplicate",
        },
      ]),
    ).toBe("Participant emails must be unique.");
  });

  it("scores submitted entries with line items and deterministic standings inputs", () => {
    const { settings } = createLaunchReadySettings();
    const alicePicks = completePickPayload(settings, "teamOne");
    const bobPicks = completePickPayload(settings, "teamTwo");
    const results: RoundOf16PickPayload = {
      winners: Object.fromEntries(
        settings.matchups.map((matchup, index) => [
          matchup.id,
          index < 6 ? matchup.teamOne : matchup.teamTwo,
        ]),
      ),
      bonusAnswers: alicePicks.bonusAnswers,
    };

    const aliceScore = scoreRoundOf16Entry({
      settings,
      picks: alicePicks,
      results,
    });
    const bobScore = scoreRoundOf16Entry({
      settings,
      picks: bobPicks,
      results,
    });

    expect(aliceScore.maxPoints).toBe(39);
    expect(aliceScore.total).toBe(33);
    expect(bobScore.total).toBe(21);
    expect(aliceScore.lines).toHaveLength(13);
    expect(
      aliceScore.lines.every((line) => line.key && line.maxPoints >= line.pointsAwarded),
    ).toBe(true);
  });

  it("rebuilds persisted pick payloads and score-breakdown item ids from stored rows", () => {
    const { settings } = createLaunchReadySettings();
    const [firstMatchup] = settings.matchups;
    const [firstBonus] = getEnabledRoundOf16BonusProps(settings);

    const { payload, itemIds } = pickPayloadAndItemIdsFromItems({
      settings,
      items: [
        {
          id: "pick-item-winner-1",
          value: {
            matchupId: firstMatchup.id,
            winner: firstMatchup.teamOne,
          },
        },
        {
          id: "pick-item-bonus-1",
          value: {
            propId: firstBonus.id,
            answer: "24",
          },
        },
      ],
    });

    expect(payload.winners[firstMatchup.id]).toBe(firstMatchup.teamOne);
    expect(payload.bonusAnswers[firstBonus.id]).toBe("24");
    expect(itemIds.get("r16_1_winner")).toBe("pick-item-winner-1");
    expect(itemIds.get(`bonus_${firstBonus.id}`)).toBe("pick-item-bonus-1");
  });

  it("keeps the submission RPC hardened around trusted pool and invite state", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260706000000_harden_round_of_16_submission_rpc.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "select pools.owner_id, pools.name, pools.template_version_id",
    );
    expect(migration).toContain(
      "if v_pool_template_version_id <> p_template_version_id then",
    );
    expect(migration).toContain("if v_pick_item_count = 0 then");
    expect(migration).toContain("and pool_id = p_pool_id");
    expect(migration).toContain("or accepted_by = p_user_id");
    expect(migration).toContain("and email is null");
    expect(migration).toContain("and status = 'pending'");
    expect(migration).not.toContain("p_owner_id");
    expect(migration).not.toContain("p_pool_name");
  });

  it("requires the atomic scoring snapshot RPC instead of fallback writes", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/round-of-16/persistence.ts"),
      "utf8",
    );
    const snapshotFunction = source.slice(
      source.indexOf("async function replaceRoundOf16ScoreSnapshot"),
      source.indexOf("export async function refreshRoundOf16Scoring"),
    );

    expect(snapshotFunction).toContain("replace_round_of_16_score_snapshot");
    expect(snapshotFunction).toContain("throw new Error(snapshotError.message)");
    expect(snapshotFunction).not.toContain(".from(\"standings_snapshots\")");
    expect(snapshotFunction).not.toContain(".from(\"score_breakdowns\")");
  });
});
