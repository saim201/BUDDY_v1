import scenarios from "@/data/scenarios.json";

type TraitId = keyof typeof scenarios.traits;

export interface Choice {
  scenarioId: string;
  optionIndex: number;
}

export interface RankedTrait {
  id: TraitId;
  name: string;
  /** -1..1, relative to everything this run could have measured. */
  score: number;
}

export const SCENARIOS = scenarios.scenarios;
export const DOMAINS = scenarios.domains as Record<
  string,
  { name: string; blurb: string; facets: Record<string, number> }
>;
export const TRAITS = scenarios.traits as Record<TraitId, string>;
export const OPEN_QUESTIONS = scenarios.openQuestions as Record<TraitId, string>;

/**
 * The most any single trait could have scored this run. Traits show up in different
 * numbers of scenarios, so raw sums are not comparable - dividing by this makes them
 * so, and keeps every trait on the same -1..1 ruler.
 */
const CEILING: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const s of SCENARIOS) {
    const best: Record<string, number> = {};
    for (const o of s.options) {
      for (const [t, w] of Object.entries(o.w as Record<string, number>)) {
        best[t] = Math.max(best[t] ?? 0, Math.abs(w));
      }
    }
    for (const [t, w] of Object.entries(best)) out[t] = (out[t] ?? 0) + w;
  }
  return out;
})();

/** Sum the chosen options' weights, normalise, sort most-you to least-you. */
export function rank(choices: readonly Choice[]): RankedTrait[] {
  const totals: Record<string, number> = {};
  for (const c of choices) {
    const option = SCENARIOS.find((s) => s.id === c.scenarioId)?.options[c.optionIndex];
    if (!option) continue;
    for (const [t, w] of Object.entries(option.w as Record<string, number>)) {
      totals[t] = (totals[t] ?? 0) + w;
    }
  }

  return (Object.keys(TRAITS) as TraitId[])
    .map((id) => ({
      id,
      name: TRAITS[id],
      score: CEILING[id] ? (totals[id] ?? 0) / CEILING[id] : 0,
    }))
    .sort((a, b) => b.score - a.score);
}

/** The two questions worth asking: one about the top trait, one about the bottom. */
export function questionsFor(ranked: readonly RankedTrait[]): string[] {
  if (ranked.length === 0) return [];
  const ids = [ranked[0].id, ranked[ranked.length - 1].id];
  return [...new Set(ids)].map((id) => OPEN_QUESTIONS[id]).filter(Boolean);
}

export interface DomainScore {
  id: string;
  name: string;
  blurb: string;
  /** -1..1, the mean of its facets once each is pointed the same way. */
  score: number;
  facets: RankedTrait[];
}

/** Plain words instead of a number, so the reading is immediate. */
export function level(score: number): string {
  if (score > 0.35) return "strong";
  if (score > 0.1) return "leans that way";
  if (score < -0.35) return "low";
  if (score < -0.1) return "leans away";
  return "middling";
}

/** Roll the ten facets up into the five domains they belong to. */
export function domainScores(ranked: readonly RankedTrait[]): DomainScore[] {
  const byId = new Map(ranked.map((t) => [t.id as string, t]));

  return Object.entries(DOMAINS)
    .map(([id, domain]) => {
      const entries = Object.entries(domain.facets);
      const total = entries.reduce((sum, [facet, sign]) => sum + (byId.get(facet)?.score ?? 0) * sign, 0);
      return {
        id,
        name: domain.name,
        blurb: domain.blurb,
        score: total / entries.length,
        facets: entries
          .map(([facet]) => byId.get(facet))
          .filter((t): t is RankedTrait => Boolean(t)),
      };
    })
    .sort((a, b) => b.score - a.score);
}
