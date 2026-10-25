import { getScenario } from "./scenarios";
import { runTool, toolDefinitions } from "./tools";
import type { FaultId, NewSpan, RunStatus, ScenarioId } from "./types";

export const MAX_PAYLOAD_CHARS = 32_000;

export type ChatRole = "system" | "user" | "assistant" | "tool";
export interface ChatMessageIn {
  role: ChatRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelReply {
  text: string;
  toolCalls: ToolCall[];
  promptTokens: number;
  completionTokens: number;
  neurons: number | null;
}

/** Injected model client so the loop can run against Workers AI or a test double. */
export interface AiClient {
  chat(input: {
    model: string;
    messages: ChatMessageIn[];
    tools?: unknown[];
    maxTokens: number;
    step: number;
  }): Promise<{
    raw: unknown;
    gatewayLogId: string | null;
  }>;
}

export interface RunnerDeps {
  ai: AiClient;
  recordSpan(span: NewSpan): void;
  onProgress?(step: number): void;
  now(): number;
  maxSteps: number;
}

export interface RunnerInput {
  model: string;
  goal: string;
  scenario: ScenarioId;
  faults: FaultId[];
  startedAt: number;
}

export interface RunnerResult {
  status: Exclude<RunStatus, "running">;
  finalAnswer: string | null;
  error: string | null;
  steps: number;
}

/** JSON-stringify and cap the size so one span never exceeds the DO row limit. */
export function toPayload(value: unknown, limit = MAX_PAYLOAD_CHARS): string {
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text === undefined) text = "null";
  return text.length > limit ? `${text.slice(0, limit)}…[truncated ${text.length - limit} chars]` : text;
}

function parseArgs(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return { _raw: value };
    }
  }
  return {};
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Normalises the two response shapes Workers AI returns:
 * - native: { response, tool_calls: [{ name, arguments }], usage }
 * - OpenAI-compatible: { choices: [{ message: { content, tool_calls: [{ id, function: { name, arguments } }] } }], usage }
 */
export function parseModelReply(raw: unknown, step: number): ModelReply {
  const r = (raw ?? {}) as Record<string, unknown>;
  const usage = (r.usage ?? {}) as Record<string, unknown>;
  let text = "";
  let rawCalls: unknown[] = [];

  const choices = r.choices as { message?: Record<string, unknown> }[] | undefined;
  if (Array.isArray(choices) && choices[0]?.message) {
    const msg = choices[0].message;
    text = typeof msg.content === "string" ? msg.content : "";
    rawCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  } else {
    text = typeof r.response === "string" ? r.response : r.response == null ? "" : JSON.stringify(r.response);
    rawCalls = Array.isArray(r.tool_calls) ? r.tool_calls : [];
  }

  const toolCalls: ToolCall[] = rawCalls.map((c, i) => {
    const call = (c ?? {}) as Record<string, unknown>;
    const fn = (call.function ?? {}) as Record<string, unknown>;
    const name = String(fn.name ?? call.name ?? "unknown");
    return {
      id: typeof call.id === "string" && call.id ? call.id : `call_${step}_${i}`,
      name,
      arguments: parseArgs(fn.arguments ?? call.arguments),
    };
  });

  return {
    text: text.trim(),
    toolCalls,
    promptTokens: num(usage.prompt_tokens),
    completionTokens: num(usage.completion_tokens),
    neurons: typeof usage.neurons === "number" ? usage.neurons : null,
  };
}

export function systemPrompt(today: string): string {
  return [
    "You are a travel-planning assistant with access to tools.",
    `Today's date is ${today}.`,
    "Use the tools to gather facts; never invent weather, prices or exchange rates.",
    "Call a tool only when you need its result. When you have enough information, reply to the user with a concise final answer and do not call any more tools.",
  ].join(" ");
}

/** Runs the agent loop: model call → tool calls → repeat, recording every step as a span. */
export async function executeAgentRun(input: RunnerInput, deps: RunnerDeps): Promise<RunnerResult> {
  const today = new Date(input.startedAt).toISOString().slice(0, 10);
  const tools = toolDefinitions(input.faults);
  // OpenAI-style tool schema: accepted by every function-calling Workers AI model (GLM rejects the native shape).
  const openAiTools = tools.map((t) => ({ type: "function" as const, function: t }));
  const scenario = getScenario(input.scenario);
  const messages: ChatMessageIn[] = [
    { role: "system", content: systemPrompt(today) },
    { role: "user", content: input.goal || scenario?.goal || "" },
  ];

  for (let step = 1; step <= deps.maxSteps; step++) {
    const t0 = deps.now();
    let raw: unknown;
    let gatewayLogId: string | null = null;
    try {
      const res = await deps.ai.chat({ model: input.model, messages, tools: openAiTools, maxTokens: 1024, step });
      raw = res.raw;
      gatewayLogId = res.gatewayLogId;
    } catch (error) {
      const t1 = deps.now();
      const message = error instanceof Error ? error.message : String(error);
      deps.recordSpan({
        step,
        kind: "llm",
        name: input.model,
        status: "error",
        input: toPayload({ messages, tools: tools.map((t) => t.name) }),
        output: null,
        error: message,
        prompt_tokens: null,
        completion_tokens: null,
        neurons: null,
        started_at: t0,
        ended_at: t1,
        latency_ms: t1 - t0,
        gateway_log_id: null,
      });
      return { status: "failed", finalAnswer: null, error: `Model call failed: ${message}`, steps: step };
    }

    const t1 = deps.now();
    const reply = parseModelReply(raw, step);
    deps.recordSpan({
      step,
      kind: "llm",
      name: input.model,
      status: "ok",
      input: toPayload({ messages, tools: tools.map((t) => t.name) }),
      output: toPayload({ text: reply.text, tool_calls: reply.toolCalls }),
      error: null,
      prompt_tokens: reply.promptTokens,
      completion_tokens: reply.completionTokens,
      neurons: reply.neurons,
      started_at: t0,
      ended_at: t1,
      latency_ms: t1 - t0,
      gateway_log_id: gatewayLogId,
    });

    if (reply.toolCalls.length === 0) {
      deps.onProgress?.(step);
      return { status: "succeeded", finalAnswer: reply.text, error: null, steps: step };
    }

    messages.push({
      role: "assistant",
      content: reply.text,
      tool_calls: reply.toolCalls.map((c) => ({
        id: c.id,
        type: "function" as const,
        function: { name: c.name, arguments: JSON.stringify(c.arguments) },
      })),
    });

    for (const call of reply.toolCalls) {
      const s0 = deps.now();
      try {
        const out = await runTool(call.name, call.arguments, { faults: input.faults, now: input.startedAt });
        const s1 = deps.now();
        const content = JSON.stringify(out);
        deps.recordSpan({
          step,
          kind: "tool",
          name: call.name,
          status: "ok",
          input: toPayload(call.arguments),
          output: toPayload(out),
          error: null,
          prompt_tokens: null,
          completion_tokens: null,
          neurons: null,
          started_at: s0,
          ended_at: s1,
          latency_ms: s1 - s0,
          gateway_log_id: null,
        });
        messages.push({ role: "tool", name: call.name, tool_call_id: call.id, content });
      } catch (error) {
        const s1 = deps.now();
        const message = error instanceof Error ? error.message : String(error);
        deps.recordSpan({
          step,
          kind: "tool",
          name: call.name,
          status: "error",
          input: toPayload(call.arguments),
          output: null,
          error: message,
          prompt_tokens: null,
          completion_tokens: null,
          neurons: null,
          started_at: s0,
          ended_at: s1,
          latency_ms: s1 - s0,
          gateway_log_id: null,
        });
        messages.push({
          role: "tool",
          name: call.name,
          tool_call_id: call.id,
          content: JSON.stringify({ error: message }),
        });
      }
    }
    deps.onProgress?.(step);
  }

  return {
    status: "max_steps",
    finalAnswer: null,
    error: `Stopped after ${deps.maxSteps} steps without a final answer`,
    steps: deps.maxSteps,
  };
}
