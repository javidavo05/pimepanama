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

export function calcGptCost(inputTokens: number, outputTokens: number, model = "gpt-4o"): number {
  const price = model === "gpt-4.1" ? GPT41 : GPT4O;
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
