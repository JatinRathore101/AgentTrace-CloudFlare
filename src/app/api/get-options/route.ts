import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import logger from "@/lib/logger";

type DistinctRow = { value: string | null };

function queryDistinct(column: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT ${column} AS value
       FROM companies
       WHERE ${column} IS NOT NULL AND TRIM(${column}) != ''
       ORDER BY ${column} ASC`,
    )
    .all() as DistinctRow[];
  return rows.map((r) => r.value as string);
}

export async function GET() {
  logger.info("api/get-options route GET() called");
  try {
    const companyCategoryOptions = queryDistinct("companyCategory");
    const countryOptions = queryDistinct("country");
    const techOptions = queryDistinct("tech");
    const techCategoryOptions = queryDistinct("techCategory");

    const db = getDb();
    const { maxTechsInDomain } = db
      .prepare(
        `SELECT MAX(cnt) AS maxTechsInDomain
         FROM (
           SELECT COUNT(DISTINCT tech) AS cnt
           FROM companies
           WHERE domain IS NOT NULL AND tech IS NOT NULL
           GROUP BY domain
         )`,
      )
      .get() as { maxTechsInDomain: number };

    logger.info(
      `api/get-options route GET() success args={ ` +
        `companyCategoryOptions: ${companyCategoryOptions.length}, ` +
        `countryOptions: ${countryOptions.length}, ` +
        `techOptions: ${techOptions.length}, ` +
        `techCategoryOptions: ${techCategoryOptions.length}, ` +
        `maxTechsInDomain: ${maxTechsInDomain} }`,
    );

    return NextResponse.json({
      ...(maxTechsInDomain && { maxTechsInDomain: maxTechsInDomain ?? 0 }),
      companyCategoryOptions,
      countryOptions,
      techOptions,
      techCategoryOptions,
    });
  } catch (error) {
    logger.error(
      `api/get-options route GET() failed error=${JSON.stringify(error)}`,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
