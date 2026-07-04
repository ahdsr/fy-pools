"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileText,
  Gift,
  ListChecks,
  Plus,
  Save,
  Trophy,
  Users,
} from "lucide-react";
import * as React from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamPill } from "@/components/app/pool-public-widgets";
import { cn } from "@/lib/utils";
import { getAllTemplates } from "@/lib/templates/catalog";
import {
  ROUND_OF_16_DRAFT_STORAGE_KEY,
  ROUND_OF_16_BONUS_MAX_TOTAL_SHARE,
  ROUND_OF_16_TEMPLATE_SLUG,
  createDefaultRoundOf16WizardState,
  createRoundOf16PoolDraft,
  getRoundOf16ScoringBalance,
  isRoundOf16WizardStateComplete,
  saveRoundOf16Draft,
  slugifyPoolName,
  toRoundOf16PoolSettings,
  validateRoundOf16WizardState,
  validateRoundOf16InviteInputs,
  type RoundOf16PoolDraft,
  type RoundOf16WizardState,
} from "@/lib/templates/round-of-16-draft";
import {
  publishRoundOf16PoolAction,
  type PublishRoundOf16State,
} from "./actions";

const stepDefinitions = [
  {
    key: "template",
    title: "Template",
    description: "Confirm the pool format.",
    icon: FileText,
  },
  {
    key: "basics",
    title: "Basics",
    description: "Name and event details.",
    icon: Trophy,
  },
  {
    key: "matchups",
    title: "Round of 16",
    description: "Automatic bracket matchups.",
    icon: CalendarClock,
  },
  {
    key: "bonus",
    title: "Bonus props",
    description: "Extra picks and points.",
    icon: Gift,
  },
  {
    key: "scoring",
    title: "Scoring",
    description: "Points and payouts.",
    icon: ListChecks,
  },
  {
    key: "review",
    title: "Review",
    description: "Invite plan and draft.",
    icon: Users,
  },
] as const;

type StepKey = (typeof stepDefinitions)[number]["key"];

function stepIsValid(
  stepKey: StepKey,
  validation: ReturnType<typeof validateRoundOf16WizardState>,
) {
  if (stepKey === "review") {
    return Object.values(validation).every(Boolean);
  }

  return validation[stepKey];
}

function numberFromInput(value: string, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function percentLabel(value: number) {
  if (!Number.isFinite(value)) return "0%";

  return `${Math.round(value * 100)}%`;
}

function buildWizardHref(templateSlug: string, draftId?: string) {
  const params = new URLSearchParams();

  if (templateSlug) params.set("template", templateSlug);
  if (draftId) params.set("draft", draftId);

  const query = params.toString();
  return query ? `/dashboard/pools/new?${query}` : "/dashboard/pools/new";
}

function subscribeToDraftStorage(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", listener);
  window.addEventListener("poolwaffle-drafts-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("poolwaffle-drafts-change", listener);
  };
}

function getDraftStorageSnapshot() {
  if (typeof window === "undefined") return "";

  return window.localStorage.getItem(ROUND_OF_16_DRAFT_STORAGE_KEY) ?? "";
}

function findDraftInSnapshot(snapshot: string, draftId: string) {
  if (!snapshot || !draftId) return null;

  try {
    const parsed = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) return null;

    return (
      (parsed as RoundOf16PoolDraft[]).find((draft) => draft.id === draftId) ??
      null
    );
  } catch {
    return null;
  }
}

function updateBonusProp(
  state: RoundOf16WizardState,
  id: string,
  patch: Partial<RoundOf16WizardState["bonusProps"][number]>,
) {
  return {
    ...state,
    bonusProps: state.bonusProps.map((prop) =>
      prop.id === id ? { ...prop, ...patch } : prop,
    ),
  };
}

function updatePayout(
  state: RoundOf16WizardState,
  id: string,
  patch: Partial<RoundOf16WizardState["payouts"][number]>,
) {
  return {
    ...state,
    payouts: state.payouts.map((payout) =>
      payout.id === id ? { ...payout, ...patch } : payout,
    ),
  };
}

function updateParticipant(
  state: RoundOf16WizardState,
  id: string,
  patch: Partial<RoundOf16WizardState["inviteSettings"]["participants"][number]>,
) {
  return {
    ...state,
    inviteSettings: {
      ...state.inviteSettings,
      participants: state.inviteSettings.participants.map((participant) =>
        participant.id === id ? { ...participant, ...patch } : participant,
      ),
    },
  };
}

function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;

  return (
    <p className="text-xs font-medium leading-5 text-destructive">{children}</p>
  );
}

function FieldShell({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function ScoringBalanceGuide({
  balance,
  enabledBonusCount,
  compact = false,
}: {
  balance: ReturnType<typeof getRoundOf16ScoringBalance>;
  enabledBonusCount: number;
  compact?: boolean;
}) {
  const maxShareLabel = percentLabel(ROUND_OF_16_BONUS_MAX_TOTAL_SHARE);
  const recommendedPerBonus =
    enabledBonusCount > 0
      ? Math.max(0, Math.floor(balance.maxBonusTotal / enabledBonusCount))
      : 0;
  const displayBalanced = enabledBonusCount > 0 && balance.balanced;
  const singleBonusOver =
    balance.highestBonusPoints > balance.maxSingleBonusPoints;
  const balanceMessage =
    enabledBonusCount === 0
      ? "Enable at least one bonus prop."
      : singleBonusOver
        ? `No bonus can be worth more than ${balance.maxSingleBonusPoints} points.`
        : balance.bonusTotal > balance.maxBonusTotal
          ? `Reduce bonus points to ${balance.maxBonusTotal} total or fewer.`
          : "Bonus scoring is inside the balanced range.";

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4",
        !displayBalanced && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-brand-ink">Scoring balance</p>
          <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
            Keep bonuses below {maxShareLabel} of available points so winner
            picks drive the standings.
          </p>
        </div>
        <Badge variant={displayBalanced ? "secondary" : "destructive"}>
          {displayBalanced ? "Balanced" : "Needs adjustment"}
        </Badge>
      </div>
      <div
        className={cn(
          "mt-4 grid gap-3",
          compact ? "sm:grid-cols-2" : "sm:grid-cols-4",
        )}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Winner points
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-ink">
            {balance.winnerTotal}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Bonus points
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-ink">
            {balance.bonusTotal}/{balance.maxBonusTotal}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Bonus share
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-ink">
            {percentLabel(balance.bonusShare)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Suggested each
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-ink">
            {recommendedPerBonus}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-brand-success",
            !displayBalanced && "bg-destructive",
          )}
          style={{
            width: `${Math.min(100, Math.round(balance.bonusShare * 100))}%`,
          }}
        />
      </div>
      <p
        className={cn(
          "mt-3 text-sm font-medium leading-6",
          displayBalanced ? "text-muted-foreground" : "text-destructive",
        )}
      >
        {balanceMessage}
      </p>
    </div>
  );
}

function setupBracketSide(index: number) {
  return index < 4 ? "left" : "right";
}

function LockedSetupBracketTeam({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-t first:border-t-0">
      <p className="block px-3 pt-2 text-[0.68rem] font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <div className="px-3 pb-3 pt-1.5">
        <div className="min-h-10 rounded-md border bg-muted/30 px-3 py-2">
          <TeamPill team={value} className="max-w-full text-sm" />
        </div>
      </div>
    </div>
  );
}

function LockedSetupBracketMatchCard({
  matchup,
  index,
}: {
  matchup: RoundOf16WizardState["matchups"][number];
  index: number;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 hidden h-px w-4 -translate-y-px border-t border-brand-rule/70 lg:block",
          setupBracketSide(index) === "left" ? "left-full" : "right-full",
        )}
      />
      <article
        className={cn(
          "overflow-hidden rounded-lg border bg-background shadow-sm",
        )}
      >
        <div className="border-b bg-surface-ledger/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Match {index + 1}
          </p>
        </div>
        <LockedSetupBracketTeam
          label="Team 1"
          value={matchup.teamOne}
        />
        <LockedSetupBracketTeam
          label="Team 2"
          value={matchup.teamTwo}
        />
      </article>
    </div>
  );
}

function SetupBracketSummary({
  matchups,
}: {
  matchups: RoundOf16WizardState["matchups"];
}) {
  return (
    <div className="rounded-lg border bg-background shadow-sm">
      <div className="border-b bg-surface-ledger/60 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Round of 16
        </p>
      </div>
      <div className="grid divide-y">
        {matchups.map((matchup, index) => (
          <div key={matchup.id} className="min-h-11 px-3 py-2">
            <p className="text-[0.68rem] font-medium uppercase tracking-normal text-muted-foreground">
              Match {index + 1}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-brand-ink">
              {matchup.teamOne || "Team 1"} vs {matchup.teamTwo || "Team 2"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LockedSetupBracketPreview({
  matchups,
}: {
  matchups: RoundOf16WizardState["matchups"];
}) {
  const leftMatchups = matchups.slice(0, 4);
  const rightMatchups = matchups.slice(4);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[58rem] gap-5 p-1 lg:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)] lg:items-center">
        <div className="grid gap-4">
          {leftMatchups.map((matchup, index) => (
            <LockedSetupBracketMatchCard
              key={matchup.id}
              matchup={matchup}
              index={index}
            />
          ))}
        </div>
        <SetupBracketSummary matchups={matchups} />
        <div className="grid gap-4">
          {rightMatchups.map((matchup, index) => (
            <LockedSetupBracketMatchCard
              key={matchup.id}
              matchup={matchup}
              index={index + 4}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProgress({
  currentStep,
  validation,
  completedSteps,
}: {
  currentStep: number;
  validation: ReturnType<typeof validateRoundOf16WizardState>;
  completedSteps: ReadonlySet<StepKey>;
}) {
  return (
    <LedgerRows className="overflow-hidden rounded-lg border bg-surface-paper">
      {stepDefinitions.map((step, index) => {
        const Icon = step.icon;
        const complete =
          completedSteps.has(step.key) && stepIsValid(step.key, validation);
        const active = currentStep === index;

        return (
          <LedgerRow
            key={step.key}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-center gap-3",
              active ? "bg-cta-green-soft" : undefined,
            )}
          >
            <span
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full border bg-background",
                complete ? "border-brand-success text-brand-success" : undefined,
                active ? "border-primary text-brand-ink" : undefined,
              )}
            >
              {complete ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-brand-ink">{step.title}</p>
              <p className="text-xs font-normal leading-5 text-muted-foreground">
                {step.description}
              </p>
            </div>
            {active ? <Badge variant="secondary">Now</Badge> : null}
          </LedgerRow>
        );
      })}
    </LedgerRows>
  );
}

function DraftSuccessPanel({
  draft,
  onEdit,
}: {
  draft: RoundOf16PoolDraft;
  onEdit: () => void;
}) {
  const checklist = [
    "Template selected",
    "Pool basics captured",
    "Eight Round of 16 matchups configured",
    "Bonus props enabled",
    "Scoring and payouts reviewed",
    "Invite plan drafted",
  ];

  return (
    <LedgerPanel
      title="Draft created"
      description="This mock draft is saved in local storage and is not published to a public pool route yet."
      action={<Badge variant="secondary">Draft</Badge>}
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="rounded-lg border bg-background p-5">
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Pool draft
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-[0.005em] text-brand-ink">
              {draft.basics.poolName}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  Slug
                </p>
                <p className="mt-1 font-mono text-sm text-brand-ink">
                  {draft.slug}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  Mock player link
                </p>
                <p className="mt-1 font-mono text-sm text-brand-ink">
                  /pools/{draft.slug}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primaryGreen">
                <Link href="/dashboard/pools">
                  Back to pools <ArrowRight />
                </Link>
              </Button>
              <Button type="button" variant="outline" onClick={onEdit}>
                Edit draft
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-surface-ledger/70 p-4">
            <div className="flex items-start gap-3">
              <Copy className="mt-0.5 size-4 shrink-0 text-brand-mark" />
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                The player link is a placeholder until draft pools are connected
                to the public `/pools/[poolSlug]` routes.
              </p>
            </div>
          </div>
        </div>

        <LedgerRows className="overflow-hidden rounded-lg border bg-background">
          {checklist.map((item) => (
            <LedgerRow key={item} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-brand-success" />
              <p className="font-medium text-brand-ink">{item}</p>
            </LedgerRow>
          ))}
        </LedgerRows>
      </div>
    </LedgerPanel>
  );
}

function PublishedPoolPanel({
  published,
}: {
  published: NonNullable<PublishRoundOf16State["published"]>;
}) {
  const inviteMessage = [
    published.inviteNote.trim() || `Join ${published.poolName} and make your picks.`,
    "Use this signup link:",
  ].join("\n");

  return (
    <LedgerPanel
      title="Pool published"
      description="Participant links are backed by Supabase invites and can be shared across devices."
      action={<Badge variant="secondary">Open</Badge>}
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="rounded-lg border bg-background p-5">
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Published pool
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-[0.005em] text-brand-ink">
              {published.poolName}
            </h2>
            <p className="mt-3 font-mono text-sm text-brand-ink">
              {published.poolHref}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primaryGreen">
                <Link href={`${published.poolHref}/leaderboard`}>
                  View leaderboard <Trophy />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={published.poolHref}>
                  Preview pool <ExternalLink />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={published.signupInviteLink.href}>Make my picks</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/pools/new">Create another</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-surface-ledger/70 p-4">
            <div className="flex items-start gap-3">
              <Copy className="mt-0.5 size-4 shrink-0 text-brand-mark" />
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                Share the signup invite when you do not have every email yet.
                Commissioners can use the same link to submit their own picks in
                the player flow.
              </p>
            </div>
          </div>
        </div>

        <LedgerRows className="overflow-hidden rounded-lg border bg-background">
          <LedgerRow className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-ink">
                  General signup invite
                </p>
                <Badge variant="outline">{published.signupInviteLink.status}</Badge>
              </div>
              <p className="mt-1 text-xs font-normal text-muted-foreground">
                Reusable link for players whose emails are not entered yet.
              </p>
              {published.signupInviteLink.expiresAt ? (
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  Expires{" "}
                  {new Date(published.signupInviteLink.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <CopyInviteLinkButton
              href={published.signupInviteLink.href}
              label="Copy signup invite"
              copyPrefix={inviteMessage}
            />
          </LedgerRow>
          {published.inviteLinks.map((invite) => (
            <LedgerRow key={invite.code} className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-ink">
                    {invite.displayName || invite.email}
                  </p>
                  <Badge variant="outline">{invite.status}</Badge>
                </div>
                <p className="text-xs font-normal text-muted-foreground">
                  {invite.email}
                </p>
                {invite.expiresAt ? (
                  <p className="mt-1 text-xs font-normal text-muted-foreground">
                    Expires {new Date(invite.expiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <CopyInviteLinkButton href={invite.href} label="Copy link" />
            </LedgerRow>
          ))}
        </LedgerRows>
      </div>
    </LedgerPanel>
  );
}

function CopyInviteLinkButton({
  href,
  label = "Copy link",
  copyPrefix,
}: {
  href: string;
  label?: string;
  copyPrefix?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    const url =
      typeof window === "undefined" ? href : new URL(href, window.location.origin).href;
    const copyText = copyPrefix ? `${copyPrefix}\n${url}` : url;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-2">
      <p className="break-all font-mono text-sm text-brand-ink">{href}</p>
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        <Copy /> {copied ? "Copied" : label}
      </Button>
    </div>
  );
}

export function NewPoolWizardStart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templates = React.useMemo(() => getAllTemplates(), []);
  const queryTemplate = searchParams.get("template") ?? "";
  const queryDraftId = searchParams.get("draft") ?? "";
  const initialTemplate = templates.some(
    (template) => template.slug === queryTemplate,
  )
    ? queryTemplate
    : "";
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<StepKey>>(
    () => new Set(),
  );
  const [state, setState] = React.useState<RoundOf16WizardState>(() =>
    createDefaultRoundOf16WizardState(initialTemplate),
  );
  const [createdDraftId, setCreatedDraftId] = React.useState(queryDraftId);
  const [editingDraftId, setEditingDraftId] = React.useState("");
  const [publishState, publishAction, publishPending] = React.useActionState(
    publishRoundOf16PoolAction,
    {},
  );
  const draftStorageSnapshot = React.useSyncExternalStore(
    subscribeToDraftStorage,
    getDraftStorageSnapshot,
    () => "",
  );
  const effectiveDraftId = createdDraftId || queryDraftId;
  const createdDraft = React.useMemo(
    () => findDraftInSnapshot(draftStorageSnapshot, effectiveDraftId),
    [draftStorageSnapshot, effectiveDraftId],
  );
  const selectedTemplate = templates.find(
    (template) => template.slug === state.templateSlug,
  );
  const roundOf16Template = templates.find(
    (template) => template.slug === ROUND_OF_16_TEMPLATE_SLUG,
  );
  const validation = validateRoundOf16WizardState(state);
  const currentStepDefinition = stepDefinitions[currentStep];
  const currentStepValid = stepIsValid(currentStepDefinition.key, validation);
  const wizardComplete = isRoundOf16WizardStateComplete(state);
  const enabledBonusCount = state.bonusProps.filter((prop) => prop.enabled).length;
  const scoringBalance = getRoundOf16ScoringBalance(
    toRoundOf16PoolSettings(state),
  );
  const inviteError = validateRoundOf16InviteInputs(
    state.inviteSettings.participants,
  );
  const filledPayouts = state.payouts.filter(
    (payout) => payout.place.trim() || payout.amount.trim(),
  );
  const serializedSettings = JSON.stringify(toRoundOf16PoolSettings(state));
  const serializedParticipants = JSON.stringify(
    state.inviteSettings.participants,
  );

  function selectRoundOf16Template() {
    setState((current) => ({
      ...current,
      templateSlug: ROUND_OF_16_TEMPLATE_SLUG,
    }));
  }

  function goToNextStep() {
    if (!currentStepValid) return;
    setCompletedSteps((current) => {
      const next = new Set(current);
      next.add(currentStepDefinition.key);
      return next;
    });
    setCurrentStep((step) => Math.min(step + 1, stepDefinitions.length - 1));
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function addPayoutRow() {
    setState((current) => ({
      ...current,
      payouts: [
        ...current.payouts,
        {
          id: `payout-${Date.now()}`,
          place: `${current.payouts.length + 1}th Place`,
          amount: "",
        },
      ],
    }));
  }

  function addParticipantRow() {
    setState((current) => ({
      ...current,
      inviteSettings: {
        ...current.inviteSettings,
        participants: [
          ...current.inviteSettings.participants,
          {
            id: `participant-${Date.now()}`,
            email: "",
            displayName: "",
          },
        ],
      },
    }));
  }

  function handleEditDraft() {
    if (createdDraft) {
      const defaults = createDefaultRoundOf16WizardState(createdDraft.templateSlug);
      setEditingDraftId(createdDraft.id);

      setState({
        templateSlug: createdDraft.templateSlug,
        basics: {
          ...defaults.basics,
          ...createdDraft.basics,
          timezone: createdDraft.basics.timezone || defaults.basics.timezone,
        },
        matchups: createdDraft.matchups,
        bonusProps: createdDraft.bonusProps,
        scoring: createdDraft.scoring,
        payouts: createdDraft.payouts,
        inviteSettings: createdDraft.inviteSettings,
      });
    }
    setCreatedDraftId("");
    setCompletedSteps(new Set());
    setCurrentStep(0);
    router.replace(buildWizardHref(createdDraft?.templateSlug ?? state.templateSlug), {
      scroll: false,
    });
  }

  function handleSaveDraft() {
    const draft = createRoundOf16PoolDraft(state, editingDraftId || effectiveDraftId);

    saveRoundOf16Draft(draft);
    setEditingDraftId(draft.id);
    setCreatedDraftId(draft.id);
    router.replace(buildWizardHref(draft.templateSlug, draft.id), {
      scroll: false,
    });
  }

  if (publishState.published) {
    return (
      <PageShell
        eyebrow="Pool wizard"
        title="Round of 16 pool published"
        description="Copy participant links and send them to the people joining this pool."
        showHeader={false}
      >
        <PublishedPoolPanel published={publishState.published} />
      </PageShell>
    );
  }

  if (createdDraft) {
    return (
      <PageShell
        eyebrow="Pool wizard"
        title="Round of 16 draft"
        description="Review the saved mock pool draft before this flow is connected to hosted pool publishing."
        showHeader={false}
      >
        <DraftSuccessPanel draft={createdDraft} onEdit={handleEditDraft} />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Pool wizard"
      title="Set up a Round of 16 pool"
      description="A guided commissioner flow for winner picks, bonus props, scoring, payouts, and invite planning."
      showHeader={false}
    >
      <section className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-5">
          <StepProgress
            currentStep={currentStep}
            validation={validation}
            completedSteps={completedSteps}
          />
          <LedgerPanel title="Draft output">
            <LedgerRows>
              <LedgerRow>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  Storage
                </p>
                <p className="mt-1 font-mono text-sm text-brand-ink">
                  poolwaffle.poolDrafts
                </p>
              </LedgerRow>
              <LedgerRow>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  Current format
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-ink">
                  {selectedTemplate?.name ?? "Choose a template"}
                </p>
              </LedgerRow>
            </LedgerRows>
          </LedgerPanel>
        </aside>

        <LedgerPanel
          title={currentStepDefinition.title}
          description={currentStepDefinition.description}
          action={
            <Badge variant={currentStepValid ? "secondary" : "outline"}>
              {currentStepValid ? "Ready" : "Needs info"}
            </Badge>
          }
        >
          <form action={publishAction} className="space-y-6 p-5">
            <input type="hidden" name="settings" value={serializedSettings} />
            <input
              type="hidden"
              name="participants"
              value={serializedParticipants}
            />
            {currentStepDefinition.key === "template" ? (
              <div className="grid gap-4">
                <div className="rounded-lg border bg-background p-5">
                  <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                    Selected format
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[0.005em] text-brand-ink">
                    {selectedTemplate?.slug === ROUND_OF_16_TEMPLATE_SLUG
                      ? selectedTemplate.name
                      : "Choose the Round of 16 template"}
                  </h2>
                  <p className="mt-3 text-sm font-normal leading-6 text-muted-foreground">
                    This v1 wizard is built for a short World Cup pool with eight
                    Round of 16 winner picks and configurable bonus props.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={selectRoundOf16Template}
                    className={cn(
                      "rounded-lg border bg-surface-paper p-4 text-left transition hover:border-primary/40 hover:bg-cta-green-soft",
                      state.templateSlug === ROUND_OF_16_TEMPLATE_SLUG
                        ? "border-primary ring-1 ring-primary/20"
                        : undefined,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-ink">
                          {roundOf16Template?.name ?? "Mini Round of 16 Pool"}
                        </p>
                        <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                          Round winners, five preset props, simple scoring, and
                          invite planning.
                        </p>
                      </div>
                      {state.templateSlug === ROUND_OF_16_TEMPLATE_SLUG ? (
                        <CheckCircle2 className="size-5 shrink-0 text-brand-success" />
                      ) : (
                        <Circle className="size-5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-semibold text-brand-ink">
                      Need another format?
                    </p>
                    <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                      Other templates stay in the library until their setup
                      defaults are wired.
                    </p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/dashboard/templates">Browse templates</Link>
                    </Button>
                  </div>
                </div>

                {!validation.template ? (
                  <FieldError>
                    Select the Mini Round of 16 Pool template to continue.
                  </FieldError>
                ) : null}
              </div>
            ) : null}

            {currentStepDefinition.key === "basics" ? (
              <div className="grid gap-5 md:grid-cols-2">
                <FieldShell
                  label="Pool name"
                  htmlFor="pool-name"
                  error={
                    state.basics.poolName.trim()
                      ? undefined
                      : "Pool name is required."
                  }
                >
                  <Input
                    id="pool-name"
                    value={state.basics.poolName}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        basics: {
                          ...current.basics,
                          poolName: event.target.value,
                        },
                      }))
                    }
                  />
                </FieldShell>
                <FieldShell
                  label="Commissioner display name"
                  htmlFor="commissioner-name"
                  error={
                    state.basics.commissionerName.trim()
                      ? undefined
                      : "Commissioner name is required."
                  }
                >
                  <Input
                    id="commissioner-name"
                    placeholder="Marcin"
                    value={state.basics.commissionerName}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        basics: {
                          ...current.basics,
                          commissionerName: event.target.value,
                        },
                      }))
                    }
                  />
                </FieldShell>
                <FieldShell
                  label="Event label"
                  htmlFor="event-label"
                  error={
                    state.basics.eventLabel.trim()
                      ? undefined
                      : "Event label is required."
                  }
                >
                  <Input
                    id="event-label"
                    value={state.basics.eventLabel}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        basics: {
                          ...current.basics,
                          eventLabel: event.target.value,
                        },
                      }))
                    }
                  />
                </FieldShell>
                <FieldShell
                  label="Picks lock at (EST)"
                  htmlFor="picks-lock-at"
                  error={
                    state.basics.picksLockAt.trim()
                      ? undefined
                      : "Pick deadline is required."
                  }
                >
                  <Input
                    id="picks-lock-at"
                    type="datetime-local"
                    value={state.basics.picksLockAt}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        basics: {
                          ...current.basics,
                          picksLockAt: event.target.value,
                        },
                      }))
                    }
                  />
                </FieldShell>
                <div className="md:col-span-2">
                  <FieldShell label="Description" htmlFor="description">
                    <Textarea
                      id="description"
                      placeholder="Short note shown to invited players."
                      value={state.basics.description}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          basics: {
                            ...current.basics,
                            description: event.target.value,
                          },
                        }))
                      }
                    />
                  </FieldShell>
                </div>
              </div>
            ) : null}

            {currentStepDefinition.key === "matchups" ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-surface-ledger/70 p-4">
                  <p className="font-semibold text-brand-ink">
                    Bracket teams are predetermined
                  </p>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    This setup step only confirms the automatic Round of 16
                    bracket. The commissioner makes winner picks later through
                    the same participant form as invited players.
                  </p>
                </div>
                <LockedSetupBracketPreview matchups={state.matchups} />
              </div>
            ) : null}

            {currentStepDefinition.key === "bonus" ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold text-brand-ink">
                    {enabledBonusCount} bonus props enabled
                  </p>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    Players answer enabled props alongside their Round of 16
                    winner picks. Each bonus can be worth up to one winner pick,
                    and the full bonus pool should stay below{" "}
                    {percentLabel(ROUND_OF_16_BONUS_MAX_TOTAL_SHARE)} of all
                    points.
                  </p>
                </div>
                <ScoringBalanceGuide
                  balance={scoringBalance}
                  enabledBonusCount={enabledBonusCount}
                />
                <LedgerRows className="overflow-hidden rounded-lg border">
                  {state.bonusProps.map((prop) => (
                    <LedgerRow
                      key={prop.id}
                      className="grid gap-4 md:grid-cols-[auto_1fr_8rem] md:items-center"
                    >
                      <Checkbox
                        id={`${prop.id}-enabled`}
                        checked={prop.enabled}
                        onCheckedChange={(checked) =>
                          setState((current) =>
                            updateBonusProp(current, prop.id, {
                              enabled: checked === true,
                            }),
                          )
                        }
                      />
                      <Label
                        htmlFor={`${prop.id}-enabled`}
                        className="text-base font-semibold text-brand-ink"
                      >
                        {prop.label}
                      </Label>
                      <FieldShell
                        label="Points"
                        htmlFor={`${prop.id}-points`}
                        error={
                          prop.enabled &&
                          prop.points > scoringBalance.maxSingleBonusPoints
                            ? `Max ${scoringBalance.maxSingleBonusPoints}`
                            : undefined
                        }
                      >
                        <Input
                          id={`${prop.id}-points`}
                          type="number"
                          min={0}
                          max={scoringBalance.maxSingleBonusPoints}
                          value={prop.points}
                          onChange={(event) =>
                            setState((current) =>
                              updateBonusProp(current, prop.id, {
                                points: Math.min(
                                  Math.max(
                                    0,
                                    Math.floor(current.scoring.winnerPoints),
                                  ),
                                  Math.max(
                                    0,
                                    numberFromInput(event.target.value),
                                  ),
                                ),
                              }),
                            )
                          }
                        />
                      </FieldShell>
                    </LedgerRow>
                  ))}
                </LedgerRows>
                {!validation.bonus ? (
                  <FieldError>
                    Keep at least one bonus prop enabled and keep bonus points
                    inside the balanced range.
                  </FieldError>
                ) : null}
              </div>
            ) : null}

            {currentStepDefinition.key === "scoring" ? (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <FieldShell
                    label="Round winner points"
                    htmlFor="winner-points"
                    error={
                      state.scoring.winnerPoints > 0
                        ? undefined
                        : "Winner points must be greater than 0."
                    }
                  >
                    <Input
                      id="winner-points"
                      type="number"
                      min={1}
                      value={state.scoring.winnerPoints}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          bonusProps: current.bonusProps.map((prop) => ({
                            ...prop,
                            points: Math.min(
                              Math.max(0, numberFromInput(event.target.value)),
                              prop.points,
                            ),
                          })),
                          scoring: {
                            ...current.scoring,
                            winnerPoints: Math.max(
                              0,
                              numberFromInput(event.target.value),
                            ),
                          },
                        }))
                      }
                    />
                  </FieldShell>
                  <FieldShell label="Prize pool label" htmlFor="prize-pool">
                    <Input
                      id="prize-pool"
                      placeholder="$500"
                      value={state.scoring.prizePoolLabel}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          scoring: {
                            ...current.scoring,
                            prizePoolLabel: event.target.value,
                          },
                        }))
                      }
                    />
                  </FieldShell>
                </div>
                <ScoringBalanceGuide
                  balance={scoringBalance}
                  enabledBonusCount={enabledBonusCount}
                  compact
                />
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-brand-ink">Payouts</h3>
                      <p className="text-sm font-normal leading-6 text-muted-foreground">
                        Optional labels for the commissioner ledger.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addPayoutRow}>
                      <Plus /> Add payout
                    </Button>
                  </div>
                  <LedgerRows className="overflow-hidden rounded-lg border">
                    {state.payouts.map((payout) => (
                      <LedgerRow
                        key={payout.id}
                        className="grid gap-3 md:grid-cols-2"
                      >
                        <FieldShell
                          label="Place"
                          htmlFor={`${payout.id}-place`}
                        >
                          <Input
                            id={`${payout.id}-place`}
                            value={payout.place}
                            onChange={(event) =>
                              setState((current) =>
                                updatePayout(current, payout.id, {
                                  place: event.target.value,
                                }),
                              )
                            }
                          />
                        </FieldShell>
                        <FieldShell
                          label="Amount"
                          htmlFor={`${payout.id}-amount`}
                        >
                          <Input
                            id={`${payout.id}-amount`}
                            placeholder="$250"
                            value={payout.amount}
                            onChange={(event) =>
                              setState((current) =>
                                updatePayout(current, payout.id, {
                                  amount: event.target.value,
                                }),
                              )
                            }
                          />
                        </FieldShell>
                      </LedgerRow>
                    ))}
                  </LedgerRows>
                </div>
              </div>
            ) : null}

            {currentStepDefinition.key === "review" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <FieldShell
                      label="Expected entries"
                      htmlFor="expected-entries"
                    >
                      <Input
                        id="expected-entries"
                        type="number"
                        min={0}
                        value={state.inviteSettings.expectedEntries}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            inviteSettings: {
                              ...current.inviteSettings,
                              expectedEntries: Math.max(
                                0,
                                numberFromInput(event.target.value),
                              ),
                            },
                          }))
                        }
                      />
                    </FieldShell>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                        Pool page preview
                      </p>
                      <p className="mt-2 font-mono text-sm text-brand-ink">
                        /pools/
                        {state.basics.poolName
                          ? slugifyPoolName(state.basics.poolName)
                          : "..."}
                      </p>
                      <p className="mt-2 text-xs font-normal leading-5 text-muted-foreground">
                        The exact preview link is generated after publishing.
                      </p>
                    </div>
                  </div>
                  <FieldShell label="Invite note" htmlFor="invite-note">
                    <Textarea
                      id="invite-note"
                      placeholder="Tell players when picks lock and how to join."
                      value={state.inviteSettings.inviteNote}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          inviteSettings: {
                            ...current.inviteSettings,
                            inviteNote: event.target.value,
                          },
                        }))
                      }
                    />
                  </FieldShell>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-brand-ink">
                          Participants
                        </h3>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          Each email gets its own join link after publishing.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addParticipantRow}
                      >
                        <Plus /> Add participant
                      </Button>
                    </div>
                    <LedgerRows className="overflow-hidden rounded-lg border">
                      {state.inviteSettings.participants.map((participant) => (
                        <LedgerRow
                          key={participant.id}
                          className="grid gap-3 md:grid-cols-[1fr_1fr]"
                        >
                          <FieldShell
                            label="Email"
                            htmlFor={`${participant.id}-email`}
                          >
                            <Input
                              id={`${participant.id}-email`}
                              type="email"
                              value={participant.email}
                              onChange={(event) =>
                                setState((current) =>
                                  updateParticipant(current, participant.id, {
                                    email: event.target.value,
                                  }),
                                )
                              }
                            />
                          </FieldShell>
                          <FieldShell
                            label="Display name"
                            htmlFor={`${participant.id}-name`}
                          >
                            <Input
                              id={`${participant.id}-name`}
                              value={participant.displayName}
                              onChange={(event) =>
                                setState((current) =>
                                  updateParticipant(current, participant.id, {
                                    displayName: event.target.value,
                                  }),
                                )
                              }
                            />
                          </FieldShell>
                        </LedgerRow>
                      ))}
                    </LedgerRows>
                    <FieldError>{inviteError}</FieldError>
                  </div>
                  <div className="rounded-lg border bg-background p-5">
                    <h3 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                      {state.basics.poolName || "Untitled pool"}
                    </h3>
                    <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
                      {state.matchups.length} Round of 16 matchups,{" "}
                      {enabledBonusCount} enabled props,{" "}
                      {state.scoring.winnerPoints} points per winner, and{" "}
                      {state.inviteSettings.expectedEntries} expected entries.
                    </p>
                    <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
                      {scoringBalance.winnerTotal} matchup points and{" "}
                      {scoringBalance.bonusTotal} bonus points available.
                    </p>
                  </div>
                </div>
                <LedgerRows className="overflow-hidden rounded-lg border bg-background">
                  {stepDefinitions.slice(0, -1).map((step) => {
                    const complete = stepIsValid(step.key, validation);

                    return (
                      <LedgerRow
                        key={step.key}
                        className="flex items-center gap-3"
                      >
                        {complete ? (
                          <CheckCircle2 className="size-5 text-brand-success" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground" />
                        )}
                        <p className="font-medium text-brand-ink">
                          {step.title}
                        </p>
                      </LedgerRow>
                    );
                  })}
                  <LedgerRow>
                    <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                      Payout rows
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-ink">
                      {filledPayouts.length || 0} configured
                    </p>
                  </LedgerRow>
                </LedgerRows>
              </div>
            ) : null}

            {publishState.message ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {publishState.message}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 0}
                  onClick={goToPreviousStep}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/dashboard/pools">Cancel</Link>
                </Button>
              </div>

              {currentStepDefinition.key === "review" ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="button" variant="outline" onClick={handleSaveDraft}>
                    <Save /> Save draft
                  </Button>
                  <Button
                    type="submit"
                    variant="primaryGreen"
                    disabled={!wizardComplete || publishPending}
                  >
                    {publishPending ? "Publishing..." : "Publish pool"}{" "}
                    <CheckCircle2 />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={!currentStepValid}
                  onClick={goToNextStep}
                >
                  Continue <ArrowRight />
                </Button>
              )}
            </div>
          </form>
        </LedgerPanel>
      </section>
    </PageShell>
  );
}
