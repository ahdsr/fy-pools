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
  expectedEntries?: number;
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
export const ROUND_OF_16_BONUS_MAX_TOTAL_SHARE = 0.4;
export const ROUND_OF_16_DEFAULT_WINNER_POINTS = 3;
export const ROUND_OF_16_DEFAULT_BONUS_POINTS = 3;

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
    points: ROUND_OF_16_DEFAULT_BONUS_POINTS,
  },
  {
    id: "most-goals-team",
    label: "Team with most Round of 16 goals",
    enabled: true,
    points: ROUND_OF_16_DEFAULT_BONUS_POINTS,
  },
  {
    id: "biggest-upset",
    label: "Biggest upset winner",
    enabled: true,
    points: ROUND_OF_16_DEFAULT_BONUS_POINTS,
  },
  {
    id: "penalty-decisions",
    label: "Number of matches decided by penalties",
    enabled: true,
    points: ROUND_OF_16_DEFAULT_BONUS_POINTS,
  },
  {
    id: "most-clean-sheets",
    label: "Team with most clean sheets",
    enabled: true,
    points: ROUND_OF_16_DEFAULT_BONUS_POINTS,
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
      winnerPoints: ROUND_OF_16_DEFAULT_WINNER_POINTS,
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizedValue(value: string) {
  return value.trim().toLowerCase();
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function getRoundOf16ScoringBalance(
  settings: Pick<RoundOf16PoolSettings, "matchups" | "bonusProps" | "scoring">,
) {
  const winnerPoints = Number(settings.scoring?.winnerPoints);
  const safeWinnerPoints =
    Number.isFinite(winnerPoints) && winnerPoints > 0 ? winnerPoints : 0;
  const winnerTotal =
    (Array.isArray(settings.matchups) ? settings.matchups.length : 0) *
    safeWinnerPoints;
  const enabledBonusProps = Array.isArray(settings.bonusProps)
    ? settings.bonusProps.filter((prop) => prop?.enabled)
    : [];
  const bonusTotal = enabledBonusProps.reduce((sum, prop) => {
    const points = Number(prop.points);
    return sum + (Number.isFinite(points) ? Math.max(0, points) : 0);
  }, 0);
  const maxBonusTotal =
    winnerTotal > 0
      ? Math.floor(
          (winnerTotal * ROUND_OF_16_BONUS_MAX_TOTAL_SHARE) /
            (1 - ROUND_OF_16_BONUS_MAX_TOTAL_SHARE),
        )
      : 0;
  const maxSingleBonusPoints = Math.floor(safeWinnerPoints);
  const totalPoints = winnerTotal + bonusTotal;
  const bonusShare = totalPoints > 0 ? bonusTotal / totalPoints : 0;
  const highestBonusPoints = enabledBonusProps.reduce((max, prop) => {
    const points = Number(prop.points);
    return Math.max(max, Number.isFinite(points) ? points : 0);
  }, 0);

  return {
    winnerTotal,
    bonusTotal,
    totalPoints,
    bonusShare,
    maxBonusTotal,
    maxSingleBonusPoints,
    highestBonusPoints,
    balanced:
      winnerTotal > 0 &&
      bonusTotal <= maxBonusTotal &&
      highestBonusPoints <= maxSingleBonusPoints,
  };
}

export function validateRoundOf16PoolSettings(
  settings: Partial<RoundOf16PoolSettings> | null | undefined,
) {
  const basics = settings?.basics;
  const poolName = textValue(basics?.poolName);
  const commissionerName = textValue(basics?.commissionerName);
  const eventLabel = textValue(basics?.eventLabel);
  const timezone = textValue(basics?.timezone);
  const picksLockAt = textValue(basics?.picksLockAt);
  if (!poolName.trim()) return "Pool name is required.";
  if (!commissionerName.trim()) return "Commissioner name is required.";
  if (!eventLabel.trim()) return "Event label is required.";
  if (!timezone.trim()) return "Timezone is required.";
  if (!picksLockAt.trim()) return "Pick deadline is required.";

  const deadline = new Date(picksLockAt);
  if (Number.isNaN(deadline.getTime())) {
    return "Pick deadline must be a valid date and time.";
  }
  if (deadline.getTime() <= Date.now()) {
    return "Pick deadline must be in the future.";
  }

  if (!Array.isArray(settings?.matchups) || settings.matchups.length !== 8) {
    return "Configure exactly eight Round of 16 matchups.";
  }

  const selectedTeams = new Set<string>();
  for (const matchup of settings.matchups) {
    if (!matchup || typeof matchup !== "object") {
      return "Every Round of 16 matchup needs two teams.";
    }

    const teamOne = textValue(matchup.teamOne).trim();
    const teamTwo = textValue(matchup.teamTwo).trim();
    if (!teamOne || !teamTwo) {
      return "Every Round of 16 matchup needs two teams.";
    }
    if (normalizedValue(teamOne) === normalizedValue(teamTwo)) {
      return "A matchup cannot use the same team twice.";
    }

    for (const team of [teamOne, teamTwo]) {
      const normalizedTeam = normalizedValue(team);
      if (selectedTeams.has(normalizedTeam)) {
        return "Each Round of 16 team can appear only once.";
      }
      selectedTeams.add(normalizedTeam);
    }
  }

  const enabledProps = Array.isArray(settings?.bonusProps)
    ? settings.bonusProps.filter((prop) => prop?.enabled)
    : [];
  if (enabledProps.length === 0) {
    return "Enable at least one bonus prop.";
  }
  if (
    enabledProps.some(
      (prop) =>
        !textValue(prop.label).trim() ||
        !Number.isFinite(prop.points) ||
        prop.points < 0,
    )
  ) {
    return "Enabled bonus props need labels and non-negative points.";
  }

  const winnerPoints = settings?.scoring?.winnerPoints;
  if (!Number.isFinite(winnerPoints) || Number(winnerPoints) <= 0) {
    return "Winner points must be greater than 0.";
  }

  const scoringBalance = getRoundOf16ScoringBalance({
    matchups: settings.matchups,
    bonusProps: settings.bonusProps ?? [],
    scoring: settings.scoring as RoundOf16ScoringDraft,
  });
  if (scoringBalance.highestBonusPoints > scoringBalance.maxSingleBonusPoints) {
    return "Each bonus prop must be worth no more than one correct Round of 16 winner.";
  }
  if (scoringBalance.bonusTotal > scoringBalance.maxBonusTotal) {
    return `Bonus props can make up at most ${Math.round(
      ROUND_OF_16_BONUS_MAX_TOTAL_SHARE * 100,
    )}% of available points.`;
  }

  const payouts = Array.isArray(settings?.payouts) ? settings.payouts : [];
  if (
    payouts.some(
      (payout) =>
        textValue(payout?.amount).trim().length > 0 &&
        textValue(payout?.place).trim().length === 0,
    )
  ) {
    return "Payout amounts need a place label.";
  }

  return null;
}

export function validateRoundOf16InviteInputs(
  participants: RoundOf16InviteInput[] | null | undefined,
) {
  if (!Array.isArray(participants)) {
    return "Participant invites must be a list.";
  }

  const participantEmails = participants.map((participant) =>
    textValue(participant?.email).trim().toLowerCase(),
  );
  const participantNames = participants.map((participant) =>
    textValue(participant?.displayName).trim(),
  );
  const filledEmails = participantEmails.filter(Boolean);

  if (
    participants.some(
      (_participant, index) => participantNames[index] && !participantEmails[index],
    )
  ) {
    return "Participant names need an email, or leave the row blank.";
  }

  if (filledEmails.some((email) => !isValidEmail(email))) {
    return "Every participant email must be valid.";
  }

  if (new Set(filledEmails).size !== filledEmails.length) {
    return "Participant emails must be unique.";
  }

  return null;
}

export function createRoundOf16PoolDraft(
  state: RoundOf16WizardState,
  existingDraftId?: string,
): RoundOf16PoolDraft {
  const id =
    existingDraftId ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `draft-${Date.now()}`);

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
  const scoringBalance = getRoundOf16ScoringBalance(
    toRoundOf16PoolSettings(state),
  );
  const settingsError = validateRoundOf16PoolSettings(
    toRoundOf16PoolSettings(state),
  );
  const inviteError = validateRoundOf16InviteInputs(
    state.inviteSettings.participants,
  );

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
      enabledProps.every((prop) => Number.isFinite(prop.points) && prop.points >= 0) &&
      scoringBalance.balanced,
    scoring:
      Number.isFinite(state.scoring.winnerPoints) &&
      state.scoring.winnerPoints > 0 &&
      scoringBalance.balanced &&
      state.payouts.every(
        (payout) =>
          payout.place.trim().length > 0 || payout.amount.trim().length === 0,
      ),
    invites:
      Number.isFinite(state.inviteSettings.expectedEntries) &&
      state.inviteSettings.expectedEntries > 0 &&
      !settingsError &&
      !inviteError,
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
    expectedEntries: state.inviteSettings.expectedEntries,
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
