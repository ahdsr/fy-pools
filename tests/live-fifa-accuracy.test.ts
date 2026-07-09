import { describe, expect, it } from "vitest";

import aliases from "@/data/marcins-world-cup-2026/team-aliases.json";
import picks from "@/data/marcins-world-cup-2026/picks.json";
import results from "@/data/marcins-world-cup-2026/results.json";
import {
  FIFA_CALENDAR_URL,
  normalizeKey,
} from "@/lib/world-cup-pool/results-updater";
import type { EntryPicks, MatchResult, PoolResults } from "@/lib/world-cup-pool/types";

const runLiveAudit = process.env.FY_POOLS_LIVE_FIFA_AUDIT === "1";
const typedPicks = picks as EntryPicks;
const typedResults = results as PoolResults;

function asArray<T>(value: T[] | undefined | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function localizedDescription(value: { Locale?: string; Description?: string }[] | undefined) {
  return (
    asArray(value).find((item) => item.Locale === "en-GB")?.Description ??
    asArray(value).find((item) => item.Locale === "en")?.Description ??
    asArray(value)[0]?.Description ??
    ""
  );
}

function numberValue(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function rawTeamName(team: {
  ShortClubName?: string;
  TeamName?: { Locale?: string; Description?: string }[];
  Abbreviation?: string;
}) {
  return team?.ShortClubName ?? localizedDescription(team?.TeamName) ?? team?.Abbreviation ?? "";
}

const aliasLookup = new Map<string, string>();
for (const group of Object.values(typedPicks.groups ?? {})) {
  for (const team of group.teams ?? []) aliasLookup.set(normalizeKey(team.name), team.name);
}
for (const [alias, canonical] of Object.entries(aliases.aliases ?? aliases)) {
  aliasLookup.set(normalizeKey(alias), canonical);
}

function resolveTeam(value: unknown) {
  const raw = String(value ?? "").trim();
  return aliasLookup.get(normalizeKey(raw)) ?? raw;
}

function teamId(team: { IdTeam?: string | number; idTeam?: string | number; Id?: string | number; id?: string | number }) {
  const id = team?.IdTeam ?? team?.idTeam ?? team?.Id ?? team?.id;
  return id === undefined || id === null ? "" : String(id);
}

function rawScore(match: Record<string, unknown>, side: "Home" | "Away") {
  const team = match[side] as { Score?: string | number } | undefined;
  return numberValue(match[`${side}TeamScore`] ?? team?.Score);
}

function rawState(match: Record<string, unknown>) {
  const status = numberValue(match.MatchStatus);
  const hasScore = rawScore(match, "Home") !== null && rawScore(match, "Away") !== null;
  if (status === 0 || (numberValue(match.OfficialityStatus) === 1 && hasScore)) return "post";
  if ([3, 5].includes(status ?? -1)) return "in";
  return "pre";
}

function rawWinner(
  match: {
    Winner?: string | number;
    Home?: { IdTeam?: string | number; idTeam?: string | number; Id?: string | number; id?: string | number };
    Away?: { IdTeam?: string | number; idTeam?: string | number; Id?: string | number; id?: string | number };
  },
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
) {
  const winnerId = String(match.Winner ?? "");
  if (winnerId && winnerId === teamId(match.Home ?? {})) return homeTeam;
  if (winnerId && winnerId === teamId(match.Away ?? {})) return awayTeam;
  if (homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    return homeScore > awayScore ? homeTeam : awayTeam;
  }
  return "";
}

function officialMatchValue(match: Record<string, unknown>): MatchResult {
  const home = match.Home as Parameters<typeof rawTeamName>[0] | undefined;
  const away = match.Away as Parameters<typeof rawTeamName>[0] | undefined;
  const homeTeam = resolveTeam(rawTeamName(home ?? {})) || String(match.PlaceHolderA ?? "");
  const awayTeam = resolveTeam(rawTeamName(away ?? {})) || String(match.PlaceHolderB ?? "");
  const homeScore = rawScore(match, "Home");
  const awayScore = rawScore(match, "Away");
  const state = rawState(match);
  const completed = state === "post";
  const winner = completed
    ? rawWinner(
        match as Parameters<typeof rawWinner>[0],
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
      )
    : "";

  return {
    id: String(match.IdMatch ?? ""),
    state,
    completed,
    detail: "",
    date: String(match.Date ?? match.MatchDate ?? ""),
    stage: localizedDescription(match.StageName as { Locale?: string; Description?: string }[]),
    group: localizedDescription(match.GroupName as { Locale?: string; Description?: string }[]),
    matchNumber: numberValue(match.MatchNumber),
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homePenaltyScore: numberValue(match.HomeTeamPenaltyScore),
    awayPenaltyScore: numberValue(match.AwayTeamPenaltyScore),
    winner,
    loser: winner && winner === homeTeam ? awayTeam : winner ? homeTeam : "",
  };
}

function counted(match: MatchResult) {
  return (
    (match.state === "in" || match.state === "post" || match.completed) &&
    match.homeScore !== null &&
    match.awayScore !== null
  );
}

function emptyStats(team: string) {
  return {
    team,
    played: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function applyScore(
  home: ReturnType<typeof emptyStats>,
  away: ReturnType<typeof emptyStats>,
  homeScore: number,
  awayScore: number,
) {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (homeScore > awayScore) {
    home.points += 3;
  } else if (awayScore > homeScore) {
    away.points += 3;
  } else {
    home.points += 1;
    away.points += 1;
  }
}

function sameMembers(actual: string[] | undefined, expected: string[], label: string) {
  expect(actual?.slice().sort(), label).toEqual(expected.slice().sort());
}

describe.skipIf(!runLiveAudit)("live FIFA accuracy audit", () => {
  it("matches the live FIFA calendar for scores, fixtures, groups, and knockout advancement", async () => {
    const response = await fetch(FIFA_CALENDAR_URL, {
      headers: {
        accept: "application/json",
        "user-agent": "fy-pools-live-fifa-audit",
      },
    });
    expect(response.ok, `FIFA calendar request should succeed: ${response.status}`).toBe(true);
    const calendar = (await response.json()) as { Results?: Record<string, unknown>[] };
    const officialMatches = asArray(calendar.Results).map(officialMatchValue);
    const officialCounted = officialMatches.filter(counted);
    const officialFixtures = officialMatches.filter((match) => !match.completed);

    expect(typedResults.meta?.source).toBe("fifa");
    expect(typedResults.meta?.sourceUrl).toBe(FIFA_CALENDAR_URL);
    expect(typedResults.matches).toHaveLength(officialCounted.length);
    expect(typedResults.fixtures).toHaveLength(officialFixtures.length);

    const siteById = new Map((typedResults.matches ?? []).map((match) => [match.id, match]));
    for (const official of officialCounted) {
      const site = siteById.get(official.id);
      expect(site, `site should include FIFA match ${official.id}`).toBeTruthy();
      expect(site?.source, `${official.id} should carry FIFA source`).toBe("fifa");
      expect(site?.homeTeam, `${official.id} home team should match FIFA`).toBe(official.homeTeam);
      expect(site?.awayTeam, `${official.id} away team should match FIFA`).toBe(official.awayTeam);
      expect(site?.homeScore, `${official.id} home score should match FIFA`).toBe(official.homeScore);
      expect(site?.awayScore, `${official.id} away score should match FIFA`).toBe(official.awayScore);
      expect(site?.winner, `${official.id} winner should match FIFA`).toBe(official.winner);
      expect(site?.loser, `${official.id} loser should match FIFA`).toBe(official.loser);
      if (official.homePenaltyScore !== null) {
        expect(site?.homePenaltyScore, `${official.id} home penalties should match FIFA`).toBe(
          official.homePenaltyScore,
        );
      }
      if (official.awayPenaltyScore !== null) {
        expect(site?.awayPenaltyScore, `${official.id} away penalties should match FIFA`).toBe(
          official.awayPenaltyScore,
        );
      }
    }

    const fixtureById = new Map((typedResults.fixtures ?? []).map((match) => [match.id, match]));
    for (const official of officialFixtures) {
      const site = fixtureById.get(official.id);
      expect(site, `site should include FIFA fixture ${official.id}`).toBeTruthy();
      expect(site?.homeTeam, `${official.id} fixture home team should match FIFA`).toBe(official.homeTeam);
      expect(site?.awayTeam, `${official.id} fixture away team should match FIFA`).toBe(official.awayTeam);
    }

    const teamToGroup = new Map<string, string>();
    for (const [groupId, group] of Object.entries(typedPicks.groups ?? {})) {
      for (const team of group.teams ?? []) teamToGroup.set(normalizeKey(team.name), groupId);
    }

    const independentGroups = Object.fromEntries(
      Object.entries(typedPicks.groups ?? {}).map(([groupId, group]) => [
        groupId,
        new Map((group.teams ?? []).map((team) => [team.name, emptyStats(team.name)])),
      ]),
    );

    for (const match of officialCounted) {
      const homeGroup = teamToGroup.get(normalizeKey(match.homeTeam));
      const awayGroup = teamToGroup.get(normalizeKey(match.awayTeam));
      if (!homeGroup || homeGroup !== awayGroup) continue;
      const stats = independentGroups[homeGroup];
      const home = stats.get(match.homeTeam) ?? emptyStats(match.homeTeam);
      const away = stats.get(match.awayTeam) ?? emptyStats(match.awayTeam);
      applyScore(home, away, match.homeScore ?? 0, match.awayScore ?? 0);
      stats.set(match.homeTeam, home);
      stats.set(match.awayTeam, away);
    }

    for (const [groupId, stats] of Object.entries(independentGroups)) {
      const siteStats = new Map((typedResults.groups?.[groupId]?.stats ?? []).map((item) => [item.team, item]));
      for (const [team, expected] of stats) {
        const actual = siteStats.get(team);
        expect(actual, `Group ${groupId} should include ${team}`).toBeTruthy();
        for (const key of ["played", "points", "goalsFor", "goalsAgainst", "goalDifference"] as const) {
          expect(actual?.[key], `Group ${groupId} ${team} ${key} should match raw FIFA matches`).toBe(
            expected[key],
          );
        }
      }
    }

    function officialWinners(stageName: string) {
      return officialCounted
        .filter((match) => match.stage === stageName)
        .sort((a, b) => Number(a.matchNumber ?? 0) - Number(b.matchNumber ?? 0))
        .map((match) => match.winner)
        .filter(Boolean);
    }

    sameMembers(typedResults.roundOf16, officialWinners("Round of 32"), "Round of 32 winners should match FIFA");
    sameMembers(
      typedResults.quarterFinalists,
      officialWinners("Round of 16"),
      "Round of 16 winners should match FIFA",
    );
    sameMembers(
      typedResults.semifinalists,
      officialWinners("Quarter-final"),
      "Quarter-final winners should match FIFA",
    );
  }, 60_000);
});
