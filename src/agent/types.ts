// Shared types for the AgentTrace agent core, API routes and UI.

export type ScenarioId = "lisbon-weekend" | "tokyo-weather" | "budget-check";
export type FaultId = "wrong_tool" | "loop" | "stale_context" | "tool_error" | "token_waste";
export type ToolName = "getUserProfile" | "getWeather" | "searchFlights" | "convertCurrency";

export type RunStatus = "running" | "succeeded" | "failed" | "max_steps";
export type SpanKind = "llm" | "tool";
export type SpanStatus = "ok" | "error";
export type Severity = "info" | "warn" | "crit";

export interface Scenario {
  id: ScenarioId;
  title: string;
  goal: string;
  expectedTools: ToolName[];
}

export interface Fault {
  id: FaultId;
  label: string;
  description: string;
  expectedDetectors: string[];
}

export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export interface Run {
  id: string;
  scenario: ScenarioId;
  goal: string;
  faults: FaultId[];
  model: string;
  status: RunStatus;
  final_answer: string | null;
  error: string | null;
  steps: number;
  prompt_tokens: number;
  completion_tokens: number;
  neurons: number;
  cost_usd: number;
  started_at: number;
  ended_at: number | null;
  is_demo: boolean;
}

export interface RunSummary extends Run {
  duration_ms: number | null;
  findings_count: number;
  crit_count: number;
}

/** One recorded step: an LLM call or a tool call. input/output are JSON strings (truncated). */
export interface Span {
  id: string;
  run_id: string;
  seq: number;
  step: number;
  kind: SpanKind;
  name: string;
  status: SpanStatus;
  input: string | null;
  output: string | null;
  error: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  neurons: number | null;
  started_at: number;
  ended_at: number;
  latency_ms: number;
  gateway_log_id: string | null;
}

export type NewSpan = Omit<Span, "id" | "run_id" | "seq">;

export interface Finding {
  id: string;
  run_id: string;
  detector: string;
  severity: Severity;
  span_seq: number | null;
  message: string;
  evidence: string | null;
}

export type NewFinding = Omit<Finding, "id" | "run_id">;

export interface ChatMessage {
  id: string;
  run_id: string;
  role: "user" | "assistant";
  content: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  neurons: number | null;
  created_at: number;
}

export interface RunDetail {
  run: RunSummary;
  spans: Span[];
  findings: Finding[];
  chat: ChatMessage[];
}

export interface StartRunInput {
  scenarioId: ScenarioId;
  faults: FaultId[];
  model: string;
  goal?: string;
}

/** RPC-safe result type: Durable Object RPC loses custom error classes, so failures are values. */
export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = <T = never>(status: number, error: string): Result<T> => ({ ok: false, status, error });
