// Neuron and USD estimates. Workers AI responses usually report usage.neurons; rates are the fallback.

export const USD_PER_1K_NEURONS = 0.011;
export const FREE_NEURONS_PER_DAY = 10_000;

/** Neurons per 1M tokens, from the Workers AI pricing page (USD price / 0.011 per 1,000 Neurons). */
export const NEURON_RATES: Record<string, { in: number; out: number }> = {
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { in: 26668, out: 204805 },
  "@cf/zai-org/glm-4.7-flash": { in: 5500, out: 36364 },
};

export function estimateNeurons(
  model: string,
  promptTokens: number,
  completionTokens: number,
  reportedNeurons?: number | null,
): number {
  if (typeof reportedNeurons === "number" && Number.isFinite(reportedNeurons)) return reportedNeurons;
  const rate = NEURON_RATES[model];
  if (!rate) return 0;
  return (promptTokens * rate.in + completionTokens * rate.out) / 1_000_000;
}

export const neuronsToUsd = (neurons: number): number => (neurons / 1000) * USD_PER_1K_NEURONS;
