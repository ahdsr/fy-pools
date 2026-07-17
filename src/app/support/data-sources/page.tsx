import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import {
  FIFA_CALENDAR_URL,
  FIFA_GROUP_TIEBREAKERS_URL,
  FIFA_MEN_RANKING_URL,
  FIFA_STANDINGS_URL,
  FIFA_TEAM_STATISTICS_URL,
} from "@/lib/world-cup-pool/reference-urls";

export const metadata: Metadata = {
  title: "Sports data sources",
  description: "The sports-data providers PoolWaffle uses for event setup, live results, and World Cup scoring context.",
  alternates: { canonical: "/support/data-sources" },
};

type SourceLink = {
  label: string;
  href: string;
};

type Source = {
  name: string;
  description: string;
  uses: readonly string[];
  links: readonly SourceLink[];
};

const sources: readonly Source[] = [
  {
    name: "FIFA",
    description: "Official World Cup data and supporting competition information.",
    uses: [
      "Match schedules, fixture state, and completed World Cup scores feed the World Cup pool refresh.",
      "Match timelines and team statistics calculate eligible World Cup bonus results, including goal, card, and pass-completion measures.",
      "Standings, tiebreakers, and the men’s ranking provide transparent context for group placement and projection rules.",
    ],
    links: [
      { label: "World Cup match calendar API", href: FIFA_CALENDAR_URL },
      { label: "World Cup standings", href: FIFA_STANDINGS_URL },
      { label: "World Cup group tiebreakers", href: FIFA_GROUP_TIEBREAKERS_URL },
      { label: "World Cup team statistics", href: FIFA_TEAM_STATISTICS_URL },
      { label: "FIFA/Coca-Cola Men’s World Ranking", href: FIFA_MEN_RANKING_URL },
    ],
  },
  {
    name: "ESPN",
    description: "Scoreboard and standings feeds used to prepare event-backed pool setup.",
    uses: [
      "NBA scoreboard and standings data prepare playoff teams, first-round series, and the first-tip lock for NBA Series Bracket pools.",
      "PGA Tour scoreboard data prepares tournament dates and the confirmed golfer field for Top Five Predictor pools.",
      "ATP scoreboard data prepares men’s-singles main-draw fields and first-serve locks for ATP Top Four pools.",
    ],
    links: [
      {
        label: "NBA scoreboard API",
        href: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
      },
      {
        label: "NBA standings API",
        href: "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings",
      },
      {
        label: "PGA Tour scoreboard API",
        href: "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
      },
      {
        label: "ATP scoreboard API",
        href: "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
      },
    ],
  },
  {
    name: "Jolpica F1 API",
    description: "Formula 1 calendar and season-driver information for the F1 Grand Prix Predictor.",
    uses: [
      "Race calendars supply Grand Prix names, locations, qualifying sessions, and race start times.",
      "The season driver roster pre-fills the setup field. PoolWaffle marks it provisional until a commissioner reviews the race’s entrants.",
    ],
    links: [
      { label: "Jolpica F1 API", href: "https://api.jolpi.ca/ergast/f1" },
      { label: "Jolpica", href: "https://jolpi.ca/" },
    ],
  },
];

export default function DataSourcesPage() {
  return (
    <PageShell
      eyebrow="Support"
      title="Sports data sources"
      description="PoolWaffle uses these providers to prepare eligible event fields and refresh World Cup results. Providers inform the product; PoolWaffle applies each pool’s own scoring and lock rules."
    >
      <div className="grid gap-5">
        {sources.map((source) => (
          <LedgerPanel key={source.name} title={source.name} description={source.description}>
            <LedgerRows>
              <LedgerRow className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-brand-ink">How we use it</h2>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {source.uses.map((use) => <li key={use}>{use}</li>)}
                </ul>
              </LedgerRow>
              <LedgerRow className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-brand-ink">Source links</h2>
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {source.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-hot hover:underline"
                      >
                        {link.label} <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </LedgerRow>
            </LedgerRows>
          </LedgerPanel>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Source availability and timing can vary. Before finalizing a pool, commissioners should review the event field, lock time, and results shown in their workspace.
      </p>
    </PageShell>
  );
}
