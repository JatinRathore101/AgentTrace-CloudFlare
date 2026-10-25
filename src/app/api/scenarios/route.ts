// API 1 — GET /api/scenarios: scenario, fault and model catalog for the New-run dialog.
import { env } from "cloudflare:workers";
import { FAULTS, MODELS, SCENARIOS } from "@/agent/scenarios";

export async function GET() {
  return Response.json({
    scenarios: SCENARIOS,
    faults: FAULTS,
    models: MODELS.map((m) => ({ ...m, default: m.id === env.MODEL_DEFAULT })),
  });
}
