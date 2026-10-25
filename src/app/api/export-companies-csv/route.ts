import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import logger from "@/lib/logger";

type RequestBody = {
  domains: string[];
};

type Data = {
  domain: string;
  companyName?: string;
  companyCategory?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  tech?: string;
  techCategory?: string;
};

type CompanyRow = {
  "Company Domain": string;
  "Company Name": string;
  "Company Category": string;
  "Company City": string;
  "Company State": string;
  "Company Zipcode": string;
  "Company Country": string;
  "Technology Name": string;
  "Technology Category": string;
};

function buildDataQuery(
  domains: string[],
): { sql: string; params: string[] } | null {
  if (!domains.length) return null;

  const sql = `
    SELECT
      domain,
      companyName,
      companyCategory,
      city,
      state,
      zipcode,
      country,
      tech,
      techCategory
    FROM companies
    WHERE domain IN (${domains.map(() => "?").join(", ")})
    ORDER BY LOWER(domain) ASC
  `.trim();

  return { sql, params: domains };
}

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    logger.warn("api/export-companies-csv POST() invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logger.info(
    `api/export-companies-csv POST() called args=${JSON.stringify(body)}`,
  );

  const domains = [...new Set(body.domains || [])];
  if (!Array.isArray(domains) || domains.length === 0) {
    const validationError = "domains must be a non-empty array";
    logger.warn(
      `api/export-companies-csv POST() validation failed error="${validationError}"`,
    );
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const db = getDb();

    logger.info(
      `api/export-companies-csv POST() processing domains=${domains.length}`,
    );

    let data: CompanyRow[] = [];
    const dataQuery = buildDataQuery(domains);
    if (dataQuery) {
      logger.debug(
        `api/export-companies-csv POST() sql="${dataQuery.sql}" params=${JSON.stringify(
          dataQuery.params,
        )}`,
      );
      const rows = db.prepare(dataQuery.sql).all(...dataQuery.params) as Data[];

      data = rows.map(
        ({
          domain,
          companyName,
          companyCategory,
          city,
          state,
          zipcode,
          country,
          tech,
          techCategory,
        }): CompanyRow => ({
          "Company Domain": domain ?? "",
          "Company Name":
            typeof companyName === "string" ? companyName.trim() : "",
          "Company Category":
            typeof companyCategory === "string" ? companyCategory.trim() : "",
          "Company City": typeof city === "string" ? city.trim() : "",
          "Company State": typeof state === "string" ? state.trim() : "",
          "Company Zipcode": typeof zipcode === "string" ? zipcode.trim() : "",
          "Company Country": typeof country === "string" ? country.trim() : "",
          "Technology Name": typeof tech === "string" ? tech.trim() : "",
          "Technology Category":
            typeof techCategory === "string" ? techCategory.trim() : "",
        }),
      );
    }

    const headers: (keyof CompanyRow)[] = [
      "Company Domain",
      "Company Name",
      "Company Category",
      "Company City",
      "Company State",
      "Company Zipcode",
      "Company Country",
      "Technology Name",
      "Technology Category",
    ];

    logger.info(
      `api/export-companies-csv POST() generating CSV rows=${data.length} columns=${headers.length}`,
    );

    let csv = "";

    csv += headers.join(",") + "\n";

    for (const row of data) {
      const values = headers.map((key) => escapeCSVField(row[key]));
      csv += values.join(",") + "\n";
    }

    logger.info(
      `api/export-companies-csv POST() CSV generated successfully rows=${data.length}`,
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="companies.csv"`,
      },
    });
  } catch (error) {
    logger.error(
      `api/export-companies-csv POST() failed error=${JSON.stringify(error)}`,
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
