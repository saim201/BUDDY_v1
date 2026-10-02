/** Anthropic is the only external service now, so this is the whole of it. */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function anthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY");
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";
}
