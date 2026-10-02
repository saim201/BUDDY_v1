import { describe, expect, it } from "vitest";
import { OPEN_QUESTIONS, SCENARIOS, TRAITS, questionsFor, rank } from "@/lib/read";

const everyFirstOption = SCENARIOS.map((s) => ({ scenarioId: s.id, optionIndex: 0 }));

describe("scenario data", () => {
  it("has twelve scenarios, each with at least three options", () => {
    expect(SCENARIOS).toHaveLength(12);
    for (const s of SCENARIOS) expect(s.options.length).toBeGreaterThanOrEqual(3);
  });

  it("only ever weights traits that exist, and covers all ten", () => {
    const seen = new Set<string>();
    for (const s of SCENARIOS) {
      for (const o of s.options) {
        for (const trait of Object.keys(o.w)) {
          expect(TRAITS).toHaveProperty(trait);
          seen.add(trait);
        }
      }
    }
    expect(seen.size).toBe(Object.keys(TRAITS).length);
  });

  it("has an open question for every trait", () => {
    for (const trait of Object.keys(TRAITS)) expect(OPEN_QUESTIONS[trait as keyof typeof TRAITS]).toBeTruthy();
  });
});

describe("rank", () => {
  it("returns every trait, sorted most-you to least-you", () => {
    const ranked = rank(everyFirstOption);
    expect(ranked).toHaveLength(Object.keys(TRAITS).length);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it("keeps every score on the same -1..1 ruler, so traits are comparable", () => {
    for (const trait of rank(everyFirstOption)) {
      expect(trait.score).toBeGreaterThanOrEqual(-1);
      expect(trait.score).toBeLessThanOrEqual(1);
    }
  });

  it("drives a trait to the bottom when every choice pushes it down", () => {
    // Per scenario, the option that pushes self_discipline lowest. It cannot reach -1:
    // some scenarios offer no negative option for it, so 0 is the best available there.
    const choices = SCENARIOS.map((s) => {
      const weights = s.options.map((o) => (o.w as Record<string, number>).self_discipline ?? 0);
      return { scenarioId: s.id, optionIndex: weights.indexOf(Math.min(...weights)) };
    });
    const ranked = rank(choices);
    expect(ranked[ranked.length - 1].id).toBe("self_discipline");
    expect(ranked[ranked.length - 1].score).toBeLessThan(-0.5);
  });

  it("ignores choices pointing at scenarios that do not exist", () => {
    expect(rank([{ scenarioId: "nope", optionIndex: 0 }]).every((t) => t.score === 0)).toBe(true);
  });
});

describe("questionsFor", () => {
  it("asks about the top and bottom trait", () => {
    const ranked = rank(everyFirstOption);
    const questions = questionsFor(ranked);
    expect(questions).toHaveLength(2);
    expect(questions).toContain(OPEN_QUESTIONS[ranked[0].id]);
    expect(questions).toContain(OPEN_QUESTIONS[ranked[ranked.length - 1].id]);
  });

  it("returns nothing when there is nothing ranked", () => {
    expect(questionsFor([])).toEqual([]);
  });
});
