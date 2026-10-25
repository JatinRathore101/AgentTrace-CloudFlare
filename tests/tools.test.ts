import { describe, expect, it } from "vitest";
import { runTool, toolDefinitions } from "@/agent/tools";
import { START } from "./helpers";

const ctx = (faults: Parameters<typeof runTool>[2]["faults"] = []) => ({ faults, now: START });

describe("toolDefinitions", () => {
  it("exposes the four tools with JSON-schema parameters", () => {
    const defs = toolDefinitions([]);
    expect(defs.map((d) => d.name)).toEqual(["getUserProfile", "getWeather", "searchFlights", "convertCurrency"]);
    expect(defs.every((d) => d.parameters.type === "object")).toBe(true);
  });

  it("swaps weather and flight descriptions under wrong_tool", () => {
    const normal = toolDefinitions([]);
    const swapped = toolDefinitions(["wrong_tool"]);
    const desc = (list: typeof normal, name: string) => list.find((d) => d.name === name)?.description;
    expect(desc(swapped, "getWeather")).toBe(desc(normal, "searchFlights"));
    expect(desc(swapped, "searchFlights")).toBe(desc(normal, "getWeather"));
  });
});

describe("runTool", () => {
  it("is deterministic for the same arguments", async () => {
    const a = await runTool("getWeather", { city: "Lisbon", date: "2026-10-31" }, ctx());
    const b = await runTool("getWeather", { city: "Lisbon", date: "2026-10-31" }, ctx());
    expect(a).toEqual(b);
  });

  it("returns a fresh profile normally and a stale one under stale_context", async () => {
    const fresh = (await runTool("getUserProfile", {}, ctx())) as Record<string, string>;
    const stale = (await runTool("getUserProfile", {}, ctx(["stale_context"]))) as Record<string, string>;
    expect(fresh.currency).toBe("INR");
    expect(fresh.as_of).toBe(new Date(START).toISOString());
    expect(stale.as_of).toBe("2024-01-01T00:00:00.000Z");
  });

  it("keeps answering pending under loop", async () => {
    const out = (await runTool(
      "searchFlights",
      { from: "Bengaluru", to: "Lisbon", date: "2026-10-31" },
      ctx(["loop"]),
    )) as Record<string, string>;
    expect(out.status).toBe("pending");
  });

  it("throws under tool_error and for unknown tools", async () => {
    await expect(
      runTool("convertCurrency", { amount: 1, from: "USD", to: "INR" }, ctx(["tool_error"])),
    ).rejects.toThrow(/503/);
    await expect(runTool("bookHotel", {}, ctx())).rejects.toThrow(/Unknown tool/);
  });

  it("converts currencies and rejects unsupported pairs", async () => {
    const out = (await runTool("convertCurrency", { amount: 100, from: "USD", to: "INR" }, ctx())) as Record<
      string,
      number
    >;
    expect(out.converted).toBeCloseTo(8410, 0);
    await expect(runTool("convertCurrency", { amount: 1, from: "USD", to: "XYZ" }, ctx())).rejects.toThrow(
      /Unsupported/,
    );
  });

  it("returns more than 4,000 characters under token_waste", async () => {
    const out = await runTool("getWeather", { city: "Tokyo", date: "2026-10-27" }, ctx(["token_waste"]));
    expect(JSON.stringify(out).length).toBeGreaterThan(4000);
  });
});
