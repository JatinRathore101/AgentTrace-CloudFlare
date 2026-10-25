import type { ChatMessageIn } from "./runner";
import type { ChatMessage, Finding, Run, Span } from "./types";

export const EXCERPT_CHARS = 400;
export const HISTORY_MESSAGES = 10;
export const DEFAULT_QUESTION = "Why did this run fail?";

export function excerpt(text: string | null, limit = EXCERPT_CHARS): string | null {
  if (text == null) return null;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

/** Compact, size-bounded JSON view of a run for the Ask-AI prompt. */
export function buildTraceDigest(run: Run, spans: Span[], findings: Finding[]): string {
  return JSON.stringify({
    run: {
      id: run.id,
      scenario: run.scenario,
      goal: run.goal,
      faults: run.faults,
      model: run.model,
      status: run.status,
      steps: run.steps,
      tokens: { prompt: run.prompt_tokens, completion: run.completion_tokens },
      cost_usd: Number(run.cost_usd.toFixed(6)),
      final_answer: excerpt(run.final_answer),
      error: run.error,
    },
    spans: spans.map((s) => ({
      seq: s.seq,
      step: s.step,
      kind: s.kind,
      name: s.name,
      status: s.status,
      latency_ms: s.latency_ms,
      prompt_tokens: s.prompt_tokens,
      completion_tokens: s.completion_tokens,
      // LLM inputs repeat the whole conversation; the output is what matters.
      input_excerpt: s.kind === "tool" ? excerpt(s.input) : null,
      output_excerpt: excerpt(s.output),
      error: s.error,
    })),
    findings: findings.map((f) => ({
      detector: f.detector,
      severity: f.severity,
      span_seq: f.span_seq,
      message: f.message,
    })),
  });
}

export const EXPLAIN_SYSTEM_PROMPT = [
  "You are AgentTrace's debugging assistant. You explain why an AI agent run behaved as it did.",
  "Use ONLY the trace and findings provided. Cite span numbers like [#4].",
  "If the trace does not show the cause, say so.",
  'Answer in at most 8 short bullet points, then one line starting with "Fix:" naming the change to make (prompt, tool, or code).',
].join(" ");

export function buildExplainMessages(digest: string, history: ChatMessage[], question: string): ChatMessageIn[] {
  const recent = history.slice(-HISTORY_MESSAGES);
  return [
    { role: "system", content: `${EXPLAIN_SYSTEM_PROMPT}\n\nTRACE:\n${digest}` },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessageIn),
    { role: "user", content: question.trim() || DEFAULT_QUESTION },
  ];
}
