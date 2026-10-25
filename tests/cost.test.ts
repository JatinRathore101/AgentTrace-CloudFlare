import { describe, expect, it } from "vitest";
import { estimateNeurons, neuronsToUsd } from "@/agent/cost";

describe("cost", () => {
  it("prefers neurons reported by Workers AI", () => {
    expect(estimateNeurons("@cf/meta/llama-3.3-70b-instruct-fp8-fast", 1000, 100, 0.2776)).toBe(0.2776);
  });

  it("falls back to published per-token rates", () => {
    // 1M input + 1M output tokens on Llama 3.3 70B = 26,668 + 204,805 Neurons
    expect(estimateNeurons("@cf/meta/llama-3.3-70b-instruct-fp8-fast", 1_000_000, 1_000_000)).toBe(231_473);
  });

  it("returns 0 for unknown models without reported usage", () => {
    expect(estimateNeurons("@cf/unknown/model", 1000, 1000)).toBe(0);
  });

  it("converts Neurons to USD at $0.011 per 1,000", () => {
    expect(neuronsToUsd(10_000)).toBeCloseTo(0.11, 10);
  });
});
