// Single Worker: agent routes (/agents/*) first, then the Next.js app served by vinext.
import handler from "vinext/server/fetch-handler";
import { routeAgentRequest } from "agents";

export { TraceAgent } from "../src/agent/trace-agent";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (await routeAgentRequest(request, env)) ?? handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
