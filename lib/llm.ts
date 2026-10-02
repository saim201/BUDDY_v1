import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropicApiKey, anthropicModel } from "@/lib/env";

/**
 * The one Anthropic call this app makes.
 *
 * No temperature / top_p / top_k: they are removed on current models and return 400.
 * Structured output via betaZodOutputFormat rather than asking for JSON politely.
 */
const MAX_TOKENS = 4000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: anthropicApiKey() });
  return client;
}

/** Returns null on any failure, so callers have one path to handle. */
export async function callStructured<T>(
  system: string,
  userMessage: string,
  schema: z.ZodType<T>,
  label: string,
): Promise<T | null> {
  try {
    const response = await getClient().beta.messages.parse({
      model: anthropicModel(),
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: betaZodOutputFormat(schema) },
    });

    if (response.stop_reason === "refusal" || response.parsed_output == null) {
      console.warn(`[llm] ${label}: no usable output`);
      return null;
    }
    return schema.parse(response.parsed_output);
  } catch (error) {
    console.warn(`[llm] ${label} failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
