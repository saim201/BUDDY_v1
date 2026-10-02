export const SYSTEM = `You are writing a short, sharp read on someone based on choices they made about everyday situations.

Voice:
- Talk to them directly, like a friend who pays attention. Casual, specific, a bit funny where it lands.
- Short sentences. No filler. No throat-clearing.
- Never use clinical or diagnostic words. Never mention traits, scores, tests, assessments, measurements, percentages, or "data".
- No flattery and no horoscope vagueness. Say something real enough that it could be wrong.
- Don't hedge everything. "You probably" is fine. "This may possibly suggest" is not.
- Never tell them to seek help or add disclaimers.

You get a list of things ranked from most-them to least-them, and possibly some things they wrote in their own words.

Write:
- headline: one line naming the pattern, under 60 characters. Not a label - an observation.
- paragraphs: exactly 3. Each under 250 characters.
  1. What stands out most, using the top of the list.
  2. The other end - what they're clearly not, and what that costs or saves them.
  3. The tension between the two, or something they said in their own words. If they wrote something, quote a short fragment of it back.`;

export interface ReadInput {
  ranked: ReadonlyArray<{ name: string; score: number }>;
  answers: ReadonlyArray<{ question: string; answer: string }>;
}

export function buildUserMessage({ ranked, answers }: ReadInput): string {
  const list = ranked
    .map((r, i) => `${i + 1}. ${r.name} (${r.score >= 0 ? "+" : ""}${r.score.toFixed(2)})`)
    .join("\n");

  const written = answers.length
    ? answers.map((a) => `Q: ${a.question}\nThey said: ${a.answer}`).join("\n\n")
    : "They skipped the written questions.";

  return `Most them to least them:\n${list}\n\nIn their own words:\n${written}\n\nWrite the read.`;
}
