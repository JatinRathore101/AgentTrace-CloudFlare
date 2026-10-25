// API 6 — GET /api/compare?a=&b=: metric deltas, findings diff and aligned steps for two runs.
import { getTraceAgent } from "@/lib/agent-client";
import { errorResponse, handle, toResponse } from "@/lib/http";

export async function GET(request: Request) {
  return handle("GET /api/compare", async () => {
    const params = new URL(request.url).searchParams;
    const a = params.get("a");
    const b = params.get("b");
    if (!a || !b) return errorResponse(400, "Query parameters a and b are required");
    const agent = await getTraceAgent();
    return toResponse(await agent.compare(a, b));
  });
}
