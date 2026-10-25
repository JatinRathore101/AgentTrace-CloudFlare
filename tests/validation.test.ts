import { describe, expect, it } from "vitest";
import { parseExplain, parseListQuery, parseStartRun } from "@/lib/validation";

const MODEL = "@cf/zai-org/glm-4.7-flash";

describe("parseStartRun", () => {
  it("accepts a valid body and applies the default model", () => {
    const r = parseStartRun({ scenarioId: "lisbon-weekend", faults: ["loop", "loop"] }, MODEL);
    expect(r).toEqual({
      ok: true,
      data: { scenarioId: "lisbon-weekend", faults: ["loop"], model: MODEL, goal: undefined },
    });
  });

  it.each([
    [undefined, /JSON object/],
    [{ scenarioId: "mars" }, /scenarioId/],
    [{ scenarioId: "tokyo-weather", faults: ["meteor"] }, /faults/],
    [{ scenarioId: "tokyo-weather", model: "@cf/x/y" }, /model/],
    [{ scenarioId: "tokyo-weather", goal: "g".repeat(501) }, /500/],
  ])("rejects %j", (body, message) => {
    const r = parseStartRun(body, MODEL);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.error).toMatch(message);
    }
  });
});

describe("parseExplain / parseListQuery", () => {
  it("validates explain bodies", () => {
    expect(parseExplain({ message: "why?" }).ok).toBe(true);
    expect(parseExplain({ message: "x".repeat(1001) }).ok).toBe(false);
  });

  it("validates list queries", () => {
    expect(parseListQuery(new URLSearchParams("limit=20&status=failed"))).toEqual({
      ok: true,
      data: { limit: 20, status: "failed" },
    });
    expect(parseListQuery(new URLSearchParams("limit=0")).ok).toBe(false);
    expect(parseListQuery(new URLSearchParams("status=done")).ok).toBe(false);
  });
});
