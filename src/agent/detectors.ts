import type { NewFinding, Run, Scenario, Span } from "./types";

export const DEFAULT_THRESHOLDS = {
  /** Identical tool name + arguments repeated this many times is a loop. */
  loopRepeat: 3,
  /** Tool data older than this (relative to run start) is stale. */
  staleHours: 24,
  /** Tool outputs larger than this many characters waste tokens. */
  tokenWasteChars: 4000,
  /** Prompt tokens on a later step this many times step 1 indicate context bloat. */
  promptGrowthFactor: 3,
  /** Latency thresholds for the informational slow_step finding. */
  slowToolMs: 2000,
  slowLlmMs: 20000,
  /** Final answers shorter than this are treated as empty. */
  minAnswerChars: 20,
};
export type Thresholds = typeof DEFAULT_THRESHOLDS;

/** Stable key for "same tool call": sorted-key JSON of the arguments. */
export function canonicalArgs(input: string | null): string {
  if (!input) return "";
  try {
    const value = JSON.parse(input);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted = Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (value as Record<string, unknown>)[k];
          return acc;
        }, {});
      return JSON.stringify(sorted);
    }
    return JSON.stringify(value);
  } catch {
    return input;
  }
}

function parseJson(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Turns a run's spans into findings. Pure; unit-tested without a model. */
export function runDetectors(
  run: Pick<Run, "status" | "final_answer" | "started_at">,
  spans: Span[],
  scenario: Scenario | undefined,
  t: Thresholds = DEFAULT_THRESHOLDS,
): NewFinding[] {
  const findings: NewFinding[] = [];
  const toolSpans = spans.filter((s) => s.kind === "tool");
  const llmSpans = spans.filter((s) => s.kind === "llm");

  // loop: identical tool calls repeated
  const seen = new Map<string, Span[]>();
  for (const s of toolSpans) {
    const key = `${s.name}:${canonicalArgs(s.input)}`;
    const list = seen.get(key) ?? [];
    list.push(s);
    seen.set(key, list);
  }
  for (const list of seen.values()) {
    if (list.length >= t.loopRepeat) {
      findings.push({
        detector: "loop",
        severity: "crit",
        span_seq: list[t.loopRepeat - 1].seq,
        message: `${list[0].name} was called ${list.length} times with identical arguments`,
        evidence: JSON.stringify({ spans: list.map((s) => s.seq), arguments: list[0].input }),
      });
    }
  }

  // tool_error / model errors
  for (const s of spans.filter((x) => x.status === "error")) {
    findings.push({
      detector: "tool_error",
      severity: "crit",
      span_seq: s.seq,
      message:
        s.kind === "tool"
          ? `Tool ${s.name} failed: ${s.error ?? "unknown error"}`
          : `Model call failed: ${s.error ?? "unknown error"}`,
      evidence: JSON.stringify({ name: s.name, error: s.error }),
    });
  }

  // max_steps
  if (run.status === "max_steps") {
    findings.push({
      detector: "max_steps",
      severity: "crit",
      span_seq: spans.length ? spans[spans.length - 1].seq : null,
      message: "The agent hit the step limit without producing a final answer",
      evidence: null,
    });
  }

  // empty_answer
  if (run.status === "succeeded" && (run.final_answer ?? "").trim().length < t.minAnswerChars) {
    findings.push({
      detector: "empty_answer",
      severity: "crit",
      span_seq: llmSpans.length ? llmSpans[llmSpans.length - 1].seq : null,
      message: "The run succeeded but the final answer is empty or too short",
      evidence: JSON.stringify({ final_answer: run.final_answer }),
    });
  }

  if (scenario) {
    // unexpected_tool: called but not expected (once per tool)
    const called = new Set<string>();
    for (const s of toolSpans) {
      if (!called.has(s.name) && !scenario.expectedTools.includes(s.name as never)) {
        findings.push({
          detector: "unexpected_tool",
          severity: "warn",
          span_seq: s.seq,
          message: `${s.name} is not needed for "${scenario.title}"`,
          evidence: JSON.stringify({ expected: scenario.expectedTools }),
        });
      }
      called.add(s.name);
    }
    // missing_tool: expected but never called, in a finished run
    if (run.status === "succeeded" || run.status === "max_steps") {
      for (const name of scenario.expectedTools) {
        if (!called.has(name)) {
          findings.push({
            detector: "missing_tool",
            severity: "warn",
            span_seq: null,
            message: `Expected tool ${name} was never called`,
            evidence: JSON.stringify({ expected: scenario.expectedTools, called: [...called] }),
          });
        }
      }
    }
  }

  // stale_context: as_of older than threshold
  for (const s of toolSpans) {
    const out = parseJson(s.output) as Record<string, unknown> | null;
    const asOf = out && typeof out.as_of === "string" ? Date.parse(out.as_of) : Number.NaN;
    if (Number.isFinite(asOf)) {
      const ageHours = (run.started_at - asOf) / 3_600_000;
      if (ageHours > t.staleHours) {
        findings.push({
          detector: "stale_context",
          severity: "warn",
          span_seq: s.seq,
          message: `${s.name} returned data that is ${Math.round(ageHours / 24)} days old`,
          evidence: JSON.stringify({ as_of: out?.as_of }),
        });
      }
    }
  }

  // token_waste: oversized tool output or prompt growth
  for (const s of toolSpans) {
    if ((s.output?.length ?? 0) > t.tokenWasteChars) {
      findings.push({
        detector: "token_waste",
        severity: "warn",
        span_seq: s.seq,
        message: `${s.name} returned ${s.output?.length} characters, which are fed back into every later prompt`,
        evidence: JSON.stringify({ chars: s.output?.length }),
      });
    }
  }
  const firstPrompt = llmSpans.find((s) => (s.prompt_tokens ?? 0) > 0)?.prompt_tokens ?? 0;
  if (firstPrompt > 0) {
    const bloated = llmSpans.find((s) => (s.prompt_tokens ?? 0) > firstPrompt * t.promptGrowthFactor);
    if (bloated) {
      findings.push({
        detector: "token_waste",
        severity: "warn",
        span_seq: bloated.seq,
        message: `Prompt grew from ${firstPrompt} to ${bloated.prompt_tokens} tokens`,
        evidence: JSON.stringify({ first: firstPrompt, at: bloated.prompt_tokens }),
      });
    }
  }

  // slow_step (informational)
  for (const s of spans) {
    const limit = s.kind === "tool" ? t.slowToolMs : t.slowLlmMs;
    if (s.latency_ms > limit) {
      findings.push({
        detector: "slow_step",
        severity: "info",
        span_seq: s.seq,
        message: `${s.name} took ${(s.latency_ms / 1000).toFixed(1)} s`,
        evidence: JSON.stringify({ latency_ms: s.latency_ms }),
      });
    }
  }

  const order = { crit: 0, warn: 1, info: 2 } as const;
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || (a.span_seq ?? 1e9) - (b.span_seq ?? 1e9));
}
