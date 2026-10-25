import type { Fault, FaultId, ModelOption, Scenario, ScenarioId } from "./types";

export const SCENARIOS: Scenario[] = [
  {
    id: "lisbon-weekend",
    title: "Lisbon weekend trip",
    goal: "Plan a 2-day trip to Lisbon next weekend: check the weather, find a flight from Bengaluru, and give the total budget in my home currency.",
    expectedTools: ["getUserProfile", "getWeather", "searchFlights", "convertCurrency"],
  },
  {
    id: "tokyo-weather",
    title: "Tokyo weather",
    goal: "What will the weather be in Tokyo tomorrow?",
    expectedTools: ["getWeather"],
  },
  {
    id: "budget-check",
    title: "Budget check",
    goal: "Convert a 1,200 USD flight into my home currency.",
    expectedTools: ["getUserProfile", "convertCurrency"],
  },
];

export const FAULTS: Fault[] = [
  {
    id: "wrong_tool",
    label: "Wrong tool",
    description: "Swaps the descriptions of getWeather and searchFlights, so the model picks the wrong tool.",
    expectedDetectors: ["unexpected_tool", "missing_tool"],
  },
  {
    id: "loop",
    label: "Loop",
    description: "searchFlights always answers 'pending, call again', so the agent repeats the same call.",
    expectedDetectors: ["loop", "max_steps"],
  },
  {
    id: "stale_context",
    label: "Stale context",
    description: "getUserProfile returns data last updated in January 2024, with an outdated currency.",
    expectedDetectors: ["stale_context"],
  },
  {
    id: "tool_error",
    label: "Tool error",
    description: "convertCurrency fails with an upstream 503 error.",
    expectedDetectors: ["tool_error"],
  },
  {
    id: "token_waste",
    label: "Token waste",
    description: "getWeather returns about 10 KB of hourly readings nobody asked for.",
    expectedDetectors: ["token_waste"],
  },
];

/** Function-calling models on Workers AI that are free-tier eligible (no paid billing method). */
export const MODELS: ModelOption[] = [
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B",
    note: "Assignment-recommended model; about 400 Neurons per run",
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM 4.7 Flash",
    note: "Cheap development model with function calling",
  },
];

/**
 * Extra request parameters per model. GLM 4.7 Flash is a reasoning model: with thinking on it can spend the
 * whole max_tokens budget on hidden reasoning and return empty content, so thinking is switched off.
 */
export const MODEL_PARAMS: Record<string, Record<string, unknown>> = {
  "@cf/zai-org/glm-4.7-flash": { chat_template_kwargs: { enable_thinking: false } },
};

export const modelParams = (model: string): Record<string, unknown> => MODEL_PARAMS[model] ?? {};

export const getScenario = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);
export const isScenarioId = (id: unknown): id is ScenarioId => typeof id === "string" && !!getScenario(id);
export const isFaultId = (id: unknown): id is FaultId => typeof id === "string" && FAULTS.some((f) => f.id === id);
export const isModelId = (id: unknown): id is string => typeof id === "string" && MODELS.some((m) => m.id === id);
