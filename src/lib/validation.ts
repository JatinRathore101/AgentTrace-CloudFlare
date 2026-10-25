import { isFaultId, isModelId, isScenarioId } from "@/agent/scenarios";
import type { FaultId, Result, RunStatus, StartRunInput } from "@/agent/types";
import { fail, ok } from "@/agent/types";

export const MAX_GOAL_CHARS = 500;
export const MAX_QUESTION_CHARS = 1000;
const RUN_STATUSES: RunStatus[] = ["running", "succeeded", "failed", "max_steps"];

export function parseStartRun(body: unknown, defaultModel: string): Result<StartRunInput> {
  if (!body || typeof body !== "object") return fail(400, "Body must be a JSON object");
  const b = body as Record<string, unknown>;
  if (!isScenarioId(b.scenarioId))
    return fail(400, "scenarioId must be one of lisbon-weekend, tokyo-weather, budget-check");
  const faultsRaw = b.faults ?? [];
  if (!Array.isArray(faultsRaw) || !faultsRaw.every(isFaultId)) {
    return fail(400, "faults must be an array of: wrong_tool, loop, stale_context, tool_error, token_waste");
  }
  const faults = [...new Set(faultsRaw as FaultId[])];
  const model = b.model ?? defaultModel;
  if (!isModelId(model)) return fail(400, `model must be one of the supported models (got ${String(model)})`);
  let goal: string | undefined;
  if (b.goal !== undefined && b.goal !== null && b.goal !== "") {
    if (typeof b.goal !== "string") return fail(400, "goal must be a string");
    if (b.goal.length > MAX_GOAL_CHARS) return fail(400, `goal must be at most ${MAX_GOAL_CHARS} characters`);
    goal = b.goal.trim();
  }
  return ok({ scenarioId: b.scenarioId, faults, model, goal });
}

export function parseExplain(body: unknown): Result<{ message: string; model?: string }> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message : "";
  if (message.length > MAX_QUESTION_CHARS) return fail(400, `message must be at most ${MAX_QUESTION_CHARS} characters`);
  if (b.model !== undefined && !isModelId(b.model)) return fail(400, "model must be one of the supported models");
  return ok({ message, model: b.model as string | undefined });
}

export function parseListQuery(params: URLSearchParams): Result<{ limit: number; status?: RunStatus }> {
  const limitRaw = params.get("limit");
  const limit = limitRaw == null ? 50 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    return fail(400, "limit must be an integer between 1 and 200");
  const status = params.get("status");
  if (status && !RUN_STATUSES.includes(status as RunStatus))
    return fail(400, `status must be one of ${RUN_STATUSES.join(", ")}`);
  return ok({ limit, status: (status || undefined) as RunStatus | undefined });
}

/** Reads a JSON body; returns undefined on empty or invalid JSON (validators then reject it). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
