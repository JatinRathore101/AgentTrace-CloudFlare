import type { FaultId, ToolName } from "./types";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolContext {
  faults: FaultId[];
  /** Run start time in epoch ms; mock data is stamped relative to it. */
  now: number;
}

const WEATHER_DESCRIPTION = "Returns the weather forecast for a city on a given date (YYYY-MM-DD).";
const FLIGHTS_DESCRIPTION =
  "Searches flights between two cities on a given date (YYYY-MM-DD) and returns prices in USD.";

/** Tool schemas sent to the model. The wrong_tool fault swaps two descriptions to mislead it. */
export function toolDefinitions(faults: FaultId[]): ToolDefinition[] {
  const swap = faults.includes("wrong_tool");
  return [
    {
      name: "getUserProfile",
      description: "Returns the current user's profile: name, home city and home currency.",
      parameters: { type: "object", properties: {}, required: [] },
    },
    {
      name: "getWeather",
      description: swap ? FLIGHTS_DESCRIPTION : WEATHER_DESCRIPTION,
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, for example Lisbon" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["city", "date"],
      },
    },
    {
      name: "searchFlights",
      description: swap ? WEATHER_DESCRIPTION : FLIGHTS_DESCRIPTION,
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Departure city" },
          to: { type: "string", description: "Arrival city" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["from", "to", "date"],
      },
    },
    {
      name: "convertCurrency",
      description: "Converts an amount between two ISO currency codes, for example USD to INR.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to convert" },
          from: { type: "string", description: "Source currency code" },
          to: { type: "string", description: "Target currency code" },
        },
        required: ["amount", "from", "to"],
      },
    },
  ];
}

export const TOOL_NAMES: ToolName[] = ["getUserProfile", "getWeather", "searchFlights", "convertCurrency"];

const RATES_TO_USD: Record<string, number> = { USD: 1, INR: 1 / 84.1, EUR: 1.08, GBP: 1.27, JPY: 1 / 151.3 };

/** Small deterministic hash so mock data is stable for the same arguments. */
function hash(text: string): number {
  let h = 0;
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);

/** Executes a mock tool. Throws on unknown tools and on the tool_error fault. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const asOf = new Date(ctx.now).toISOString();
  switch (name) {
    case "getUserProfile":
      if (ctx.faults.includes("stale_context")) {
        return { name: "Jatin", homeCity: "Bengaluru", currency: "USD", as_of: "2024-01-01T00:00:00.000Z" };
      }
      return { name: "Jatin", homeCity: "Bengaluru", currency: "INR", as_of: asOf };

    case "getWeather": {
      const city = str(args.city, "Unknown");
      const date = str(args.date, asOf.slice(0, 10));
      const h = hash(city + date);
      const summaries = ["Sunny", "Partly cloudy", "Light rain", "Clear skies", "Windy"];
      const result: Record<string, unknown> = {
        city,
        date,
        summary: summaries[h % summaries.length],
        high_c: 18 + (h % 12),
        low_c: 9 + (h % 8),
        as_of: asOf,
      };
      if (ctx.faults.includes("token_waste")) {
        result.hourly = Array.from({ length: 240 }, (_, i) => ({
          hour: i,
          temp_c: 10 + ((h + i) % 15),
          humidity_pct: 40 + ((h + i * 7) % 50),
          wind_kph: (h + i * 3) % 30,
          pressure_hpa: 1000 + ((h + i) % 25),
        }));
      }
      return result;
    }

    case "searchFlights": {
      if (ctx.faults.includes("loop")) {
        return {
          status: "pending",
          message: "Results are not ready yet. Call searchFlights again with the same arguments.",
        };
      }
      const from = str(args.from, "Bengaluru");
      const to = str(args.to, "Unknown");
      const h = hash(from + to);
      return {
        from,
        to,
        date: str(args.date, asOf.slice(0, 10)),
        options: [
          { airline: "Emirates", price_usd: 780 + (h % 200), stops: 1, duration_h: 14 },
          { airline: "Lufthansa", price_usd: 840 + (h % 150), stops: 1, duration_h: 15 },
        ],
        as_of: asOf,
      };
    }

    case "convertCurrency": {
      if (ctx.faults.includes("tool_error")) {
        throw new Error("Upstream FX service returned 503 Service Unavailable");
      }
      const amount = Number(args.amount);
      const from = str(args.from).toUpperCase();
      const to = str(args.to).toUpperCase();
      if (!Number.isFinite(amount)) throw new Error("amount must be a number");
      if (!(from in RATES_TO_USD) || !(to in RATES_TO_USD)) throw new Error(`Unsupported currency pair ${from}/${to}`);
      const rate = RATES_TO_USD[from] / RATES_TO_USD[to];
      return {
        amount,
        from,
        to,
        rate: Number(rate.toFixed(4)),
        converted: Number((amount * rate).toFixed(2)),
        as_of: asOf,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
