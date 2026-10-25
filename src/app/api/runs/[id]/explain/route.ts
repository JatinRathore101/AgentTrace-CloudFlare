// API 5 — POST /api/runs/[id]/explain: Ask AI about a run (answer is stored as chat memory).
import { getTraceAgent } from "@/lib/agent-client";
import { handle, toResponse } from "@/lib/http";
import { parseExplain, readJson } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  return handle("POST /api/runs/[id]/explain", async () => {
    const { id } = await params;
    const input = parseExplain(await readJson(request));
    if (!input.ok) return toResponse(input);
    const agent = await getTraceAgent();
    return toResponse(await agent.explain(id, input.data.message, input.data.model));
  });
}
