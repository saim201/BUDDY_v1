import { z } from "zod";
import { callStructured } from "@/lib/llm";
import { rank, type Choice } from "@/lib/read";
import * as readPrompt from "@/prompts/read";

const Body = z.object({
  choices: z.array(z.object({ scenarioId: z.string(), optionIndex: z.number().int().min(0) })).min(1),
  answers: z.array(z.object({ question: z.string(), answer: z.string().max(2000) })).max(4).default([]),
});

const ReadSchema = z.object({
  headline: z.string().min(1).max(120),
  paragraphs: z.array(z.string().min(1).max(400)).length(3),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  // Ranked here, not on the client: the weights are the one thing worth keeping honest.
  const ranked = rank(parsed.data.choices as Choice[]);
  const written = parsed.data.answers.filter((a) => a.answer.trim().length > 0);

  const read = await callStructured(
    readPrompt.SYSTEM,
    readPrompt.buildUserMessage({ ranked, answers: written }),
    ReadSchema,
    "read",
  );

  return Response.json({
    ranked,
    headline: read?.headline ?? `Mostly ${ranked[0]?.name.toLowerCase()}.`,
    paragraphs: read?.paragraphs ?? [],
  });
}
