import type { Run, RunSummary, Span } from "@/agent/types";

let seq = 0;
export function span(partial: Partial<Span>): Span {
  seq += 1;
  return {
    id: `span-${seq}`,
    run_id: "run-1",
    seq: partial.seq ?? seq,
    step: 1,
    kind: "tool",
    name: "getWeather",
    status: "ok",
    input: "{}",
    output: "{}",
    error: null,
    prompt_tokens: null,
    completion_tokens: null,
    neurons: null,
    started_at: 1_000,
    ended_at: 1_010,
    latency_ms: 10,
    gateway_log_id: null,
    ...partial,
  };
}

export const START = Date.parse("2026-10-26T10:00:00.000Z");

export function run(partial: Partial<Run> = {}): Run {
  return {
    id: "run-1",
    scenario: "lisbon-weekend",
    goal: "Plan a trip",
    faults: [],
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    status: "succeeded",
    final_answer: "Here is your full Lisbon plan with weather, flights and budget.",
    error: null,
    steps: 3,
    prompt_tokens: 1000,
    completion_tokens: 200,
    neurons: 50,
    cost_usd: 0.00055,
    started_at: START,
    ended_at: START + 5000,
    is_demo: false,
    ...partial,
  };
}

export function summary(partial: Partial<RunSummary> = {}): RunSummary {
  const r = run(partial);
  return {
    ...r,
    duration_ms: r.ended_at == null ? null : r.ended_at - r.started_at,
    findings_count: 0,
    crit_count: 0,
    ...partial,
  };
}
