// API 3 — GET /api/runs/[id] (run detail) · API 4 — DELETE /api/runs/[id]
import { getTraceAgent } from "@/lib/agent-client";
import { handle, toResponse } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return handle("GET /api/runs/[id]", async () => {
    const { id } = await params;
    const agent = await getTraceAgent();
    return toResponse(await agent.getRun(id));
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return handle("DELETE /api/runs/[id]", async () => {
    const { id } = await params;
    const agent = await getTraceAgent();
    return toResponse(await agent.deleteRun(id));
  });
}
