import type { MatchResult } from "@/lib/world-cup-pool/types";

export const OFFICIAL_ROUND_OF_32_SLOTS: Record<string, number> = {
  "760486": 1,
  "760489": 2,
  "760488": 3,
  "760487": 4,
  "760490": 5,
  "760491": 6,
  "760492": 7,
  "760495": 8,
  "760499": 9,
  "760501": 10,
  "760493": 11,
  "760494": 12,
  "760498": 13,
  "760496": 14,
  "760500": 15,
  "760497": 16,
};

export function officialRoundOf32Slot(match: MatchResult, fallbackIndex = 0) {
  return OFFICIAL_ROUND_OF_32_SLOTS[match.id] ?? fallbackIndex + 1;
}

export function sortRoundOf32ByOfficialSlot(matches: MatchResult[]) {
  return matches
    .map((match, index) => ({
      match,
      slot: officialRoundOf32Slot(match, index),
    }))
    .sort((a, b) => a.slot - b.slot)
    .map(({ match }) => match);
}
