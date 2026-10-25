import type { RunStatus, Severity } from "@/agent/types";

export type ChipColor = "BLUE" | "PURPLE" | "RED" | "GREEN" | "YELLOW" | "GREY";

export const STATUS_CHIP: Record<RunStatus, { label: string; color: ChipColor }> = {
  running: { label: "running", color: "BLUE" },
  succeeded: { label: "succeeded", color: "GREEN" },
  failed: { label: "failed", color: "RED" },
  max_steps: { label: "max steps", color: "YELLOW" },
};

export const SEVERITY_CHIP: Record<Severity, ChipColor> = { crit: "RED", warn: "YELLOW", info: "BLUE" };

export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

export const fmtUsd = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n === 0) return "$0";
  return n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(3)}`;
};

export const fmtNeurons = (n: number | null | undefined) =>
  n == null ? "—" : n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-US");

export const fmtMs = (ms: number | null | undefined) => {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

export function fmtAgo(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

export const fmtSigned = (n: number | null | undefined, f: (v: number) => string = (v) => fmtInt(v)) => {
  if (n == null) return "—";
  if (n === 0) return "±0";
  return `${n > 0 ? "+" : "−"}${f(Math.abs(n))}`;
};

/** Pretty-prints a JSON string; falls back to the raw text. */
export function prettyJson(text: string | null): string {
  if (text == null) return "—";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export const shortModel = (model: string) => model.replace(/^@cf\/[^/]+\//, "");
