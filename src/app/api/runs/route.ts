// API 2 — POST /api/runs (start a run) · API 3 — GET /api/runs (list runs)
import { env } from "cloudflare:workers";
import { getTraceAgent } from "@/lib/agent-client";
import { handle, toResponse } from "@/lib/http";
import { parseListQuery, parseStartRun, readJson } from "@/lib/validation";

export async function GET(request: Request) {
  return handle("GET /api/runs", async () => {
    const query = parseListQuery(new URL(request.url).searchParams);
    if (!query.ok) return toResponse(query);
    const agent = await getTraceAgent();
    return toResponse(await agent.listRuns(query.data));
  });
}

export async function POST(request: Request) {
  return handle("POST /api/runs", async () => {
    const input = parseStartRun(await readJson(request), env.MODEL_DEFAULT);
    if (!input.ok) return toResponse(input);
    const agent = await getTraceAgent();
    return toResponse(await agent.startRun(input.data), 202);
  });
}
