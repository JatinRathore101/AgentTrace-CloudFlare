// Browser-side helpers for the AgentTrace API (UI only).
import type { Comparison } from "@/agent/compare";
import type { ChatMessage, Fault, ModelOption, RunDetail, RunSummary, Scenario, StartRunInput } from "@/agent/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok)
    throw new ApiError(res.status, typeof body.error === "string" ? body.error : `Request failed (${res.status})`);
  return body as T;
}

export type Catalog = { scenarios: Scenario[]; faults: Fault[]; models: (ModelOption & { default: boolean })[] };

export const api = {
  catalog: () => request<Catalog>("/api/scenarios"),
  listRuns: (limit = 200) => request<{ runs: RunSummary[] }>(`/api/runs?limit=${limit}`),
  getRun: (id: string) => request<RunDetail>(`/api/runs/${encodeURIComponent(id)}`),
  startRun: (input: Partial<StartRunInput>) =>
    request<{ runId: string; status: "running" }>("/api/runs", { method: "POST", body: JSON.stringify(input) }),
  deleteRun: (id: string) => request<{ deleted: true }>(`/api/runs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  explain: (id: string, message: string) =>
    request<{ answer: string; chat: ChatMessage[] }>(`/api/runs/${encodeURIComponent(id)}/explain`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  compare: (a: string, b: string) =>
    request<Comparison>(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
};
