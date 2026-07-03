export const ROUND_OF_16_DRAFT_STORAGE_KEY = "poolwaffle.poolDrafts";

export type RoundOf16DraftBasics = {
  poolName: string;
  commissionerName: string;
  eventLabel: string;
  picksLockAt: string;
  timezone: string;
  description: string;
};

export type RoundOf16MatchupDraft = {
  id: string;
  label: string;
  teamOne: string;
  teamTwo: string;
};

export type RoundOf16BonusPropDraft = {
  id: string;
  label: string;
  enabled: boolean;
  points: number;
};

export type RoundOf16ScoringDraft = {
  winnerPoints: number;
  prizePoolLabel: string;
};

export type RoundOf16PayoutDraft = {
  id: string;
  place: string;
  amount: string;
};

export type RoundOf16InviteSettingsDraft = {
  expectedEntries: number;
  inviteNote: string;
  participants: RoundOf16InviteInput[];
};

export type RoundOf16InviteInput = {
  id: string;
  email: string;
  displayName: string;
};

export type RoundOf16WizardState = {
  templateSlug: string;
  basics: RoundOf16DraftBasics;
  matchups: RoundOf16MatchupDraft[];
  bonusProps: RoundOf16BonusPropDraft[];
  scoring: RoundOf16ScoringDraft;
  payouts: RoundOf16PayoutDraft[];
  inviteSettings: RoundOf16InviteSettingsDraft;
};

export type RoundOf16PoolDraft = RoundOf16WizardState & {
  id: string;
  slug: string;
  status: "draft";
  createdAt: string;
};

export type RoundOf16PoolSettings = {
  basics: RoundOf16DraftBasics;
  matchups: RoundOf16MatchupDraft[];
  bonusProps: RoundOf16BonusPropDraft[];
  scoring: RoundOf16ScoringDraft;
  payouts: RoundOf16PayoutDraft[];
  inviteNote: string;
};

export type RoundOf16PickPayload = {
  winners: Record<string, string>;
  bonusAnswers: Record<string, string>;
};

export type RoundOf16SubmittedEntry = {
  entryId: string;
  entryPickId: string;
  submittedAt: string;
};

export const ROUND_OF_16_TEMPLATE_SLUG = "world-cup-mini-round-of-16";

export const WORLD_CUP_2026_AVAILABLE_TEAMS = [
  "Mexico",
  "South Africa",
  "South Korea",
  "Czechia",
  "Canada",
  "Bosnia & Herzegovina",
  "Qatar",
  "Switzerland",
  "Brazil",
  "Morocco",
  "Haiti",
  "Scotland",
  "United States",
  "Paraguay",
  "Australia",
  "Turkey",
  "Germany",
  "Curaçao",
  "Ivory Coast",
  "Ecuador",
  "Netherlands",
  "Japan",
  "Sweden",
  "Tunisia",
  "Belgium",
  "Egypt",
  "Iran",
  "New Zealand",
  "Spain",
  "Cape Verde",
  "Saudi Arabia",
  "Uruguay",
  "France",
  "Senegal",
  "Iraq",
  "Norway",
  "Argentina",
  "Algeria",
  "Austria",
  "Jordan",
  "Portugal",
  "DR Congo",
  "Uzbekistan",
  "Colombia",
  "England",
  "Croatia",
  "Ghana",
  "Panama",
] as const;

export const DEFAULT_ROUND_OF_16_MATCHUPS: RoundOf16MatchupDraft[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: `r16-${index + 1}`,
    label: `Round of 16 Match ${index + 1}`,
    teamOne: WORLD_CUP_2026_AVAILABLE_TEAMS[index * 2] ?? "",
    teamTwo: WORLD_CUP_2026_AVAILABLE_TEAMS[index * 2 + 1] ?? "",
  }),
);

export const DEFAULT_ROUND_OF_16_BONUS_PROPS: RoundOf16BonusPropDraft[] = [
  {
    id: "total-goals",
    label: "Total goals across Round of 16",
    enabled: true,
    points: 5,
  },
  {
    id: "most-goals-team",
    label: "Team with most Round of 16 goals",
    enabled: true,
    points: 5,
  },
  {
    id: "biggest-upset",
    label: "Biggest upset winner",
    enabled: true,
    points: 5,
  },
  {
    id: "penalty-decisions",
    label: "Number of matches decided by penalties",
    enabled: true,
    points: 5,
  },
  {
    id: "most-clean-sheets",
    label: "Team with most clean sheets",
    enabled: true,
    points: 5,
  },
];

export function createDefaultRoundOf16WizardState(
  templateSlug = ROUND_OF_16_TEMPLATE_SLUG,
): RoundOf16WizardState {
  return {
    templateSlug,
    basics: {
      poolName: "Round of 16 Pool",
      commissionerName: "",
      eventLabel: "2026 World Cup Round of 16",
      picksLockAt: "2026-07-04T12:00",
      timezone: "America/Toronto",
      description: "",
    },
    matchups: DEFAULT_ROUND_OF_16_MATCHUPS.map((matchup) => ({ ...matchup })),
    bonusProps: DEFAULT_ROUND_OF_16_BONUS_PROPS.map((prop) => ({ ...prop })),
    scoring: {
      winnerPoints: 3,
      prizePoolLabel: "",
    },
    payouts: [
      { id: "payout-1", place: "1st Place", amount: "" },
      { id: "payout-2", place: "2nd Place", amount: "" },
      { id: "payout-3", place: "3rd Place", amount: "" },
    ],
    inviteSettings: {
      expectedEntries: 16,
      inviteNote: "",
      participants: [
        {
          id: "participant-1",
          email: "",
          displayName: "",
        },
      ],
    },
  };
}

export function slugifyPoolName(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "round-of-16-pool";
}

export function createRoundOf16PoolDraft(
  state: RoundOf16WizardState,
): RoundOf16PoolDraft {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `draft-${Date.now()}`;

  return {
    ...state,
    id,
    slug: slugifyPoolName(state.basics.poolName),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export function validateRoundOf16WizardState(state: RoundOf16WizardState) {
  const enabledProps = state.bonusProps.filter((prop) => prop.enabled);

  return {
    template: state.templateSlug === ROUND_OF_16_TEMPLATE_SLUG,
    basics:
      state.basics.poolName.trim().length > 0 &&
      state.basics.commissionerName.trim().length > 0 &&
      state.basics.eventLabel.trim().length > 0 &&
      (state.basics.picksLockAt ?? "").trim().length > 0 &&
      state.basics.timezone.trim().length > 0,
    matchups:
      state.matchups.length === 8 &&
      state.matchups.every(
        (matchup) =>
          matchup.teamOne.trim().length > 0 &&
          matchup.teamTwo.trim().length > 0,
      ),
    bonus:
      enabledProps.length > 0 &&
      enabledProps.every((prop) => Number.isFinite(prop.points) && prop.points >= 0),
    scoring:
      Number.isFinite(state.scoring.winnerPoints) &&
      state.scoring.winnerPoints > 0 &&
      state.payouts.every(
        (payout) =>
          payout.place.trim().length > 0 || payout.amount.trim().length === 0,
      ),
    invites: Number.isFinite(state.inviteSettings.expectedEntries),
  };
}

export function toRoundOf16PoolSettings(
  state: RoundOf16WizardState,
): RoundOf16PoolSettings {
  return {
    basics: state.basics,
    matchups: state.matchups,
    bonusProps: state.bonusProps,
    scoring: state.scoring,
    payouts: state.payouts,
    inviteNote: state.inviteSettings.inviteNote,
  };
}

export function getEnabledRoundOf16BonusProps(settings: RoundOf16PoolSettings) {
  return settings.bonusProps.filter((prop) => prop.enabled);
}

export function isRoundOf16WizardStateComplete(state: RoundOf16WizardState) {
  const validation = validateRoundOf16WizardState(state);

  return Object.values(validation).every(Boolean);
}

export function readRoundOf16Drafts() {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(ROUND_OF_16_DRAFT_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as RoundOf16PoolDraft[]) : [];
  } catch {
    window.localStorage.removeItem(ROUND_OF_16_DRAFT_STORAGE_KEY);
    return [];
  }
}

export function saveRoundOf16Draft(draft: RoundOf16PoolDraft) {
  const drafts = readRoundOf16Drafts();
  const nextDrafts = [
    draft,
    ...drafts.filter((existingDraft) => existingDraft.id !== draft.id),
  ];

  window.localStorage.setItem(
    ROUND_OF_16_DRAFT_STORAGE_KEY,
    JSON.stringify(nextDrafts),
  );
  window.dispatchEvent(new Event("poolwaffle-drafts-change"));
}

export function findRoundOf16Draft(id: string) {
  return readRoundOf16Drafts().find((draft) => draft.id === id);
}
