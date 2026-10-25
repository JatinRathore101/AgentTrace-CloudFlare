// Spike route (todo 2.1): Next.js route handler -> TraceAgent DO RPC -> Workers AI via AI Gateway.
import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";

export async function GET() {
  try {
    const stub = await getAgentByName(env.TraceAgent, "default");
    const ping = await stub.ping();
    const ai = await stub.aiPing(env.MODEL_DEFAULT);
    return Response.json({ ok: true, ping, ai });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
