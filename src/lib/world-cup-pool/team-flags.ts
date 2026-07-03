import { normalizeName } from "@/lib/world-cup-pool/scoring";

const WORLD_CUP_TEAM_FLAG_CODES = {
  Mexico: "mx",
  "South Africa": "za",
  "South Korea": "kr",
  Czechia: "cz",
  Canada: "ca",
  "Bosnia & Herzegovina": "ba",
  Qatar: "qa",
  Switzerland: "ch",
  Brazil: "br",
  Morocco: "ma",
  Haiti: "ht",
  Scotland: "gb-sct",
  "United States": "us",
  Paraguay: "py",
  Australia: "au",
  Turkey: "tr",
  Germany: "de",
  Curaçao: "cw",
  "Ivory Coast": "ci",
  Ecuador: "ec",
  Netherlands: "nl",
  Japan: "jp",
  Sweden: "se",
  Tunisia: "tn",
  Belgium: "be",
  Egypt: "eg",
  Iran: "ir",
  "New Zealand": "nz",
  Spain: "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  Uruguay: "uy",
  France: "fr",
  Senegal: "sn",
  Iraq: "iq",
  Norway: "no",
  Argentina: "ar",
  Algeria: "dz",
  Austria: "at",
  Jordan: "jo",
  Portugal: "pt",
  "DR Congo": "cd",
  Uzbekistan: "uz",
  Colombia: "co",
  England: "gb-eng",
  Croatia: "hr",
  Ghana: "gh",
  Panama: "pa",
} as const;

const FLAG_CODE_BY_TEAM = new Map(
  Object.entries(WORLD_CUP_TEAM_FLAG_CODES).map(([team, flagCode]) => [
    normalizeName(team),
    flagCode,
  ]),
);

export function getWorldCupFlagCode(team?: string) {
  if (!team) return undefined;

  return FLAG_CODE_BY_TEAM.get(normalizeName(team));
}
