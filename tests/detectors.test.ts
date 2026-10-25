import { describe, expect, it } from "vitest";
import { canonicalArgs, runDetectors } from "@/agent/detectors";
import { getScenario } from "@/agent/scenarios";
import { run, START, span } from "./helpers";

const lisbon = getScenario("lisbon-weekend");
const tokyo = getScenario("tokyo-weather");
const iso = new Date(START).toISOString();
const happySpans = () => [
  span({
    seq: 1,
    kind: "llm",
    name: "model",
    prompt_tokens: 400,
    completion_tokens: 40,
    latency_ms: 900,
    input: null,
    output: "{}",
  }),
  span({ seq: 2, name: "getUserProfile", output: JSON.stringify({ currency: "INR", as_of: iso }) }),
  span({ seq: 3, name: "getWeather", input: '{"city":"Lisbon"}', output: JSON.stringify({ as_of: iso }) }),
  span({ seq: 4, name: "searchFlights", input: '{"to":"Lisbon"}', output: JSON.stringify({ as_of: iso }) }),
  span({ seq: 5, name: "convertCurrency", input: '{"amount":1}', output: JSON.stringify({ as_of: iso }) }),
  span({
    seq: 6,
    kind: "llm",
    name: "model",
    prompt_tokens: 900,
    completion_tokens: 120,
    latency_ms: 1200,
    input: null,
  }),
];
const names = (f: ReturnType<typeof runDetectors>) => f.map((x) => x.detector);

describe("runDetectors", () => {
  it("finds nothing on a healthy run", () => {
    expect(runDetectors(run(), happySpans(), lisbon)).toEqual([]);
  });

  it("flags identical repeated tool calls as a loop and max_steps", () => {
    const spans = [1, 2, 3].map((i) =>
      span({ seq: i, step: i, name: "searchFlights", input: '{"to":"Lisbon","from":"BLR"}' }),
    );
    spans.push(span({ seq: 4, step: 4, name: "searchFlights", input: '{"from":"BLR","to":"Lisbon"}' }));
    const f = runDetectors(run({ status: "max_steps", final_answer: null }), spans, lisbon);
    const loop = f.find((x) => x.detector === "loop");
    expect(loop?.severity).toBe("crit");
    expect(loop?.span_seq).toBe(3);
    expect(loop?.message).toContain("4 times");
    expect(names(f)).toContain("max_steps");
  });

  it("flags tool and model errors", () => {
    const f = runDetectors(
      run({ status: "failed" }),
      [
        span({ seq: 1, name: "convertCurrency", status: "error", error: "503" }),
        span({ seq: 2, kind: "llm", status: "error", error: "quota" }),
      ],
      undefined,
    );
    expect(f.filter((x) => x.detector === "tool_error")).toHaveLength(2);
  });

  it("flags empty answers on succeeded runs", () => {
    expect(names(runDetectors(run({ final_answer: "ok" }), [], undefined))).toContain("empty_answer");
  });

  it("flags unexpected and missing tools against the scenario", () => {
    const f = runDetectors(run({ scenario: "tokyo-weather" }), [span({ seq: 1, name: "searchFlights" })], tokyo);
    expect(names(f)).toEqual(expect.arrayContaining(["unexpected_tool", "missing_tool"]));
  });

  it("flags stale tool data", () => {
    const f = runDetectors(
      run(),
      [span({ seq: 1, name: "getUserProfile", output: '{"as_of":"2024-01-01T00:00:00.000Z"}' })],
      undefined,
    );
    const stale = f.find((x) => x.detector === "stale_context");
    expect(stale?.span_seq).toBe(1);
  });

  it("flags oversized outputs and prompt growth as token waste", () => {
    const big = span({ seq: 1, name: "getWeather", output: "x".repeat(5000) });
    const llm1 = span({ seq: 2, kind: "llm", prompt_tokens: 300 });
    const llm2 = span({ seq: 3, kind: "llm", prompt_tokens: 1200 });
    const f = runDetectors(run(), [big, llm1, llm2], undefined).filter((x) => x.detector === "token_waste");
    expect(f.map((x) => x.span_seq).sort()).toEqual([1, 3]);
  });

  it("sorts findings crit → warn → info", () => {
    const spans = [
      span({ seq: 1, name: "getWeather", latency_ms: 3000 }),
      span({ seq: 2, name: "x", status: "error", error: "boom" }),
      span({ seq: 3, name: "getWeather", output: "y".repeat(5000) }),
    ];
    const sev = runDetectors(run(), spans, undefined).map((x) => x.severity);
    expect(sev).toEqual(
      [...sev].sort((a, b) => ["crit", "warn", "info"].indexOf(a) - ["crit", "warn", "info"].indexOf(b)),
    );
  });

  it("canonicalises argument key order", () => {
    expect(canonicalArgs('{"b":1,"a":2}')).toBe(canonicalArgs('{"a":2,"b":1}'));
  });
});
