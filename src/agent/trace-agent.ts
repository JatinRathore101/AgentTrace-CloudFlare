import { Agent } from "agents";

type TraceAgentState = { pings: number };

/**
 * TraceAgent — Durable Object (SQLite) that will run and record agent traces.
 * Spike (todo 2.1): only proves DO RPC, SQLite and the Workers AI binding.
 */
export class TraceAgent extends Agent<Env, TraceAgentState> {
  initialState: TraceAgentState = { pings: 0 };

  async ping() {
    this.setState({ pings: this.state.pings + 1 });
    const [row] = this.sql<{ now: string }>`SELECT datetime('now') AS now`;
    return { ok: true, pings: this.state.pings, sqliteNow: row?.now };
  }

  async aiPing(model: string) {
    const startedAt = Date.now();
    const res = (await this.env.AI.run(
      model as keyof AiModels,
      { messages: [{ role: "user", content: "Reply with the single word: pong" }], max_tokens: 8 },
      { gateway: { id: this.env.AI_GATEWAY_ID } },
    )) as { response?: string; usage?: Record<string, number> };
    return {
      model,
      latencyMs: Date.now() - startedAt,
      response: res.response,
      usage: res.usage,
      gatewayLogId: this.env.AI.aiGatewayLogId,
    };
  }
}
