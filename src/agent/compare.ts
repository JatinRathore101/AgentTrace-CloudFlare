import type { Finding, RunDetail, RunSummary, Span } from "./types";

export interface SpanLite {
  seq: number;
  kind: Span["kind"];
  name: string;
  status: Span["status"];
  args: string | null;
}

export interface StepPair {
  step: number;
  a: SpanLite[];
  b: SpanLite[];
  same: boolean;
}

export interface Comparison {
  a: RunSummary;
  b: RunSummary;
  deltas: {
    steps: number;
    prompt_tokens: number;
    completion_tokens: number;
    neurons: number;
    cost_usd: number;
    duration_ms: number | null;
    errors: number;
  };
  findings: { onlyA: string[]; onlyB: string[]; both: string[] };
  steps: StepPair[];
  sameScenario: boolean;
}

const lite = (s: Span): SpanLite => ({
  seq: s.seq,
  kind: s.kind,
  name: s.name,
  status: s.status,
  args: s.kind === "tool" ? s.input : null,
});

const errorCount = (spans: Span[]) => spans.filter((s) => s.status === "error").length;
const detectors = (findings: Finding[]) => new Set(findings.map((f) => f.detector));

/** Pure comparison of two runs: b − a deltas, findings diff, steps aligned by loop step. */
export function compareRuns(a: RunDetail, b: RunDetail): Comparison {
  const da = detectors(a.findings);
  const db = detectors(b.findings);
  const maxStep = Math.max(0, ...a.spans.map((s) => s.step), ...b.spans.map((s) => s.step));
  const steps: StepPair[] = [];
  for (let step = 1; step <= maxStep; step++) {
    const sa = a.spans.filter((s) => s.step === step && s.kind === "tool").map(lite);
    const sb = b.spans.filter((s) => s.step === step && s.kind === "tool").map(lite);
    const key = (list: SpanLite[]) => list.map((s) => `${s.name}:${s.args ?? ""}`).join("|");
    steps.push({ step, a: sa, b: sb, same: key(sa) === key(sb) });
  }
  const dur = (r: RunSummary) => r.duration_ms;
  return {
    a: a.run,
    b: b.run,
    deltas: {
      steps: b.run.steps - a.run.steps,
      prompt_tokens: b.run.prompt_tokens - a.run.prompt_tokens,
      completion_tokens: b.run.completion_tokens - a.run.completion_tokens,
      neurons: b.run.neurons - a.run.neurons,
      cost_usd: b.run.cost_usd - a.run.cost_usd,
      duration_ms: dur(a.run) != null && dur(b.run) != null ? (dur(b.run) as number) - (dur(a.run) as number) : null,
      errors: errorCount(b.spans) - errorCount(a.spans),
    },
    findings: {
      onlyA: [...da].filter((d) => !db.has(d)).sort(),
      onlyB: [...db].filter((d) => !da.has(d)).sort(),
      both: [...da].filter((d) => db.has(d)).sort(),
    },
    steps,
    sameScenario: a.run.scenario === b.run.scenario,
  };
}
