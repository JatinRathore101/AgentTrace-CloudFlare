import { describe, expect, it } from "vitest";
import { compareRuns } from "@/agent/compare";
import { buildExplainMessages, buildTraceDigest, DEFAULT_QUESTION, HISTORY_MESSAGES } from "@/agent/explain";
import type { ChatMessage, Finding } from "@/agent/types";
import { run, span, summary } from "./helpers";

const finding = (detector: string): Finding => ({
  id: detector,
  run_id: "run-1",
  detector,
  severity: "crit",
  span_seq: 1,
  message: detector,
  evidence: null,
});

describe("explain", () => {
  it("builds a bounded digest with excerpts", () => {
    const digest = JSON.parse(buildTraceDigest(run(), [span({ seq: 1, output: "z".repeat(2000) })], [finding("loop")]));
    expect(digest.spans[0].output_excerpt.length).toBeLessThanOrEqual(401);
    expect(digest.findings[0].detector).toBe("loop");
  });

  it("keeps the last 10 chat messages and defaults the question", () => {
    const history: ChatMessage[] = Array.from({ length: 14 }, (_, i) => ({
      id: String(i),
      run_id: "run-1",
      role: i % 2 ? "assistant" : "user",
      content: `m${i}`,
      prompt_tokens: null,
      completion_tokens: null,
      neurons: null,
      created_at: i,
    }));
    const msgs = buildExplainMessages("{}", history, "  ");
    expect(msgs[0].role).toBe("system");
    expect(msgs).toHaveLength(1 + HISTORY_MESSAGES + 1);
    expect(msgs[1].content).toBe("m4");
    expect(msgs.at(-1)?.content).toBe(DEFAULT_QUESTION);
  });
});

describe("compareRuns", () => {
  it("computes b − a deltas, findings diff and step alignment", () => {
    const a = {
      run: summary({ id: "a", steps: 2, prompt_tokens: 500, completion_tokens: 50, cost_usd: 0.001 }),
      spans: [span({ seq: 1, step: 1, name: "getWeather", input: '{"city":"Tokyo"}' })],
      findings: [finding("slow_step")],
      chat: [],
    };
    const b = {
      run: summary({
        id: "b",
        steps: 8,
        prompt_tokens: 4000,
        completion_tokens: 300,
        cost_usd: 0.01,
        status: "max_steps",
      }),
      spans: [
        span({ seq: 1, step: 1, name: "getWeather", input: '{"city":"Tokyo"}' }),
        span({ seq: 2, step: 2, name: "searchFlights", status: "error" }),
      ],
      findings: [finding("loop"), finding("slow_step")],
      chat: [],
    };
    const c = compareRuns(a, b);
    expect(c.deltas).toMatchObject({ steps: 6, prompt_tokens: 3500, completion_tokens: 250, errors: 1 });
    expect(c.deltas.cost_usd).toBeCloseTo(0.009, 10);
    expect(c.findings).toEqual({ onlyA: [], onlyB: ["loop"], both: ["slow_step"] });
    expect(c.steps.map((s) => s.same)).toEqual([true, false]);
    expect(c.sameScenario).toBe(true);
  });
});
