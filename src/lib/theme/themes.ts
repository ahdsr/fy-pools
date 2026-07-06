export const APP_THEMES = [
  {
    id: "paper-ledger",
    name: "FY Paper Ledger",
    description: "Ink-blue, paper surfaces, bracket-grid rules.",
  },
  {
    id: "command-green",
    name: "FY Command Green",
    description: "Sports-operations green with the same component contract.",
  },
  {
    id: "live-table",
    name: "FY Live Table",
    description: "Scoreboard-inspired accents for live pool moments.",
  },
] as const;

export type AppThemeId = (typeof APP_THEMES)[number]["id"];
