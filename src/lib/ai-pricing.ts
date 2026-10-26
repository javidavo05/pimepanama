// GPT-4o pricing (as of 2025): $2.50/1M input, $10.00/1M output
// Whisper-1: $0.006/min

export const GPT4O = {
  inputPerToken: 2.50 / 1_000_000,
  outputPerToken: 10.00 / 1_000_000,
};

export const WHISPER = {
  perMs: 0.006 / 60_000, // $0.006 per minute → per millisecond
};

// GPT-4.1: $2.00/1M input, $8.00/1M output
export const GPT41 = {
  inputPerToken: 2.00 / 1_000_000,
  outputPerToken: 8.00 / 1_000_000,
};

// GPT-5.1: $1.25/1M input, $10.00/1M output (el razonamiento se cobra como salida)
export const GPT51 = {
  inputPerToken: 1.25 / 1_000_000,
  outputPerToken: 10.00 / 1_000_000,
};

// Claude (Anthropic), por millón de tokens: Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50.
const CLAUDE: Record<string, { inputPerToken: number; outputPerToken: number }> = {
  sonnet: { inputPerToken: 2 / 1_000_000, outputPerToken: 10 / 1_000_000 },
  opus: { inputPerToken: 4 / 1_000_000, outputPerToken: 20 / 1_000_000 },
  haiku: { inputPerToken: 0.1 / 1_000_000, outputPerToken: 0.5 / 1_000_000 },
};

export function calcGptCost(inputTokens: number, outputTokens: number, model = "gpt-4o"): number {
  const familia = model.startsWith("claude") ? (["opus", "haiku"].find((f) => model.includes(f)) ?? "sonnet") : null;
  const price = familia ? CLAUDE[familia] : model.startsWith("gpt-4.1") ? GPT41 : model.startsWith("gpt-5.1") ? GPT51 : GPT4O;
  return inputTokens * price.inputPerToken + outputTokens * price.outputPerToken;
}

export function calcWhisperCost(durationMs: number): number {
  return durationMs * WHISPER.perMs;
}

/** Format a USD cost for display: tiny amounts in cents, larger as dollars */
export function fmtCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `<$0.001`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}
