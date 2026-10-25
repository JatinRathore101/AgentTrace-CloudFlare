import { describe, expect, it } from "vitest";
import { type AiClient, executeAgentRun, parseModelReply, toPayload } from "@/agent/runner";
import type { NewSpan } from "@/agent/types";
import { START } from "./helpers";

/** Scripted AI double: returns the given raw responses in order. */
function scripted(responses: unknown[]): AiClient & { calls: number } {
  const client = {
    calls: 0,
    chat: async () => {
      const raw = responses[Math.min(client.calls, responses.length - 1)];
      client.calls += 1;
      if (raw instanceof Error) throw raw;
      return { raw, gatewayLogId: `log-${client.calls}` };
    },
  };
  return client;
}

function deps(ai: AiClient, maxSteps = 8) {
  const spans: NewSpan[] = [];
  let t = START;
  return {
    spans,
    deps: {
      ai,
      maxSteps,
      now: () => {
        t += 5;
        return t;
      },
      recordSpan: (s: NewSpan) => spans.push(s),
    },
  };
}

const input = (faults: ("loop" | "tool_error")[] = []) => ({
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  goal: "What will the weather be in Tokyo tomorrow?",
  scenario: "tokyo-weather" as const,
  faults,
  startedAt: START,
});

const nativeToolCall = (name: string, args: Record<string, unknown>) => ({
  response: null,
  tool_calls: [{ name, arguments: args }],
  usage: { prompt_tokens: 300, completion_tokens: 20, neurons: 9.1 },
});
const nativeAnswer = (text: string) => ({ response: text, usage: { prompt_tokens: 420, completion_tokens: 60 } });

describe("parseModelReply", () => {
  it("parses the native Workers AI shape", () => {
    const r = parseModelReply(nativeToolCall("getWeather", { city: "Tokyo" }), 1);
    expect(r.toolCalls).toEqual([{ id: "call_1_0", name: "getWeather", arguments: { city: "Tokyo" } }]);
    expect(r.neurons).toBe(9.1);
  });

  it("parses the OpenAI-compatible shape with string arguments", () => {
    const r = parseModelReply(
      {
        choices: [
          {
            message: {
              content: "",
              tool_calls: [{ id: "c1", function: { name: "getWeather", arguments: '{"city":"Tokyo"}' } }],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 2 },
      },
      2,
    );
    expect(r.toolCalls[0]).toEqual({ id: "c1", name: "getWeather", arguments: { city: "Tokyo" } });
    expect(r.promptTokens).toBe(10);
  });
});

describe("executeAgentRun", () => {
  it("sends tools in the OpenAI function format", async () => {
    let sent: unknown[] | undefined;
    const ai: AiClient = {
      chat: async (req) => {
        sent = req.tools;
        return { raw: nativeAnswer("Tokyo tomorrow: sunny with a high of 24 °C."), gatewayLogId: null };
      },
    };
    await executeAgentRun(input(), deps(ai).deps);
    expect(sent?.[0]).toMatchObject({ type: "function", function: { name: "getUserProfile" } });
  });

  it("runs tool → answer and records llm + tool spans", async () => {
    const ai = scripted([
      nativeToolCall("getWeather", { city: "Tokyo", date: "2026-10-27" }),
      nativeAnswer("Tokyo tomorrow: sunny, 24 °C high."),
    ]);
    const { spans, deps: d } = deps(ai);
    const result = await executeAgentRun(input(), d);
    expect(result).toMatchObject({ status: "succeeded", steps: 2, finalAnswer: "Tokyo tomorrow: sunny, 24 °C high." });
    expect(spans.map((s) => `${s.kind}:${s.name}`)).toEqual([
      "llm:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "tool:getWeather",
      "llm:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ]);
    expect(spans[0]).toMatchObject({
      prompt_tokens: 300,
      completion_tokens: 20,
      neurons: 9.1,
      gateway_log_id: "log-1",
    });
    expect(spans.every((s) => s.latency_ms >= 0 && s.ended_at >= s.started_at)).toBe(true);
  });

  it("stops at maxSteps when the model keeps calling tools", async () => {
    const ai = scripted([nativeToolCall("searchFlights", { from: "BLR", to: "Tokyo", date: "2026-10-27" })]);
    const { spans, deps: d } = deps(ai, 3);
    const result = await executeAgentRun(input(["loop"]), d);
    expect(result.status).toBe("max_steps");
    expect(ai.calls).toBe(3);
    expect(spans.filter((s) => s.kind === "tool")).toHaveLength(3);
  });

  it("records tool errors and continues the loop", async () => {
    const ai = scripted([
      nativeToolCall("convertCurrency", { amount: 1, from: "USD", to: "INR" }),
      nativeAnswer("Conversion failed, sorry."),
    ]);
    const { spans, deps: d } = deps(ai);
    const result = await executeAgentRun(input(["tool_error"]), d);
    expect(result.status).toBe("succeeded");
    expect(spans.find((s) => s.kind === "tool")).toMatchObject({ status: "error", output: null });
  });

  it("fails the run and records an error span when the model call throws", async () => {
    const ai = scripted([new Error("4006: daily free allocation exceeded")]);
    const { spans, deps: d } = deps(ai);
    const result = await executeAgentRun(input(), d);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("4006");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ kind: "llm", status: "error" });
  });
});

describe("toPayload", () => {
  it("truncates large payloads and marks them", () => {
    const out = toPayload("x".repeat(50), 10);
    expect(out.startsWith("xxxxxxxxxx…[truncated 40 chars]")).toBe(true);
  });
});
