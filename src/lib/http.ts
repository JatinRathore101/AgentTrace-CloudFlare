import type { Result } from "@/agent/types";
import logger from "./logger";

/** Maps an RPC Result to an HTTP response: ok → 200 (or the given status), failures → their status. */
export function toResponse<T>(result: Result<T>, okStatus = 200): Response {
  if (result.ok) return Response.json(result.data, { status: okStatus });
  return Response.json({ error: result.error }, { status: result.status });
}

export function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Wraps a handler so unexpected exceptions become a logged 500 instead of an HTML error page. */
export async function handle(name: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`api ${name} failed`, error instanceof Error ? error.stack : error);
    return errorResponse(500, `Internal error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
