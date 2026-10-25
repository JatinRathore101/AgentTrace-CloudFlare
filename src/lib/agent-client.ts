// Typed access to the single TraceAgent Durable Object instance from route handlers.
import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";

export const TRACE_AGENT_INSTANCE = "default";

export const getTraceAgent = () => getAgentByName(env.TraceAgent, TRACE_AGENT_INSTANCE);
