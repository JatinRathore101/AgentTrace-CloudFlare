import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import logger from "@/lib/logger";

type RequestBody = {
  searchStr?: string;
  countries?: string[];
  companyCategories?: string[];
  includedTechList?: string[];
  excludedTechList?: string[];
  includedTechCategoryList?: string[];
  excludedTechCategoryList?: string[];
  minNumberOfTech?: number;
  maxNumberOfTech?: number;
  skip?: number;
  limit?: number;
};

type Data = {
  domain: string;
  companyName?: string;
  companyCategory?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  tech?: string[];
  techCategory?: string[];
};

function validate(body: RequestBody): string | null {
  if ("searchStr" in body) {
    if (typeof body.searchStr !== "string" || body.searchStr.trim() === "") {
      return "searchStr must be a non-empty string if provided";
    }
    if (body.searchStr.trim().length > 100) {
      return "searchStr must not exceed 100 characters";
    }
  }

  const arrayFields: (keyof RequestBody)[] = [
    "countries",
    "companyCategories",
    "includedTechList",
    "excludedTechList",
    "includedTechCategoryList",
    "excludedTechCategoryList",
  ];

  for (const field of arrayFields) {
    const val = body[field];
    if (val !== undefined && (!Array.isArray(val) || val.length === 0)) {
      return `${field} must be a non-empty array if provided`;
    }
  }

  if (body.includedTechList?.length && body.excludedTechList?.length) {
    const excLower = body.excludedTechList.map((v) => v.toLowerCase());
    const overlap = body.includedTechList.filter((v) =>
      excLower.includes(v.toLowerCase()),
    );
    if (overlap.length > 0) {
      return `includedTechList and excludedTechList share conflicting values: ${overlap.join(", ")}`;
    }
  }

  if (
    body.includedTechCategoryList?.length &&
    body.excludedTechCategoryList?.length
  ) {
    const excLower = body.excludedTechCategoryList.map((v) => v.toLowerCase());
    const overlap = body.includedTechCategoryList.filter((v) =>
      excLower.includes(v.toLowerCase()),
    );
    if (overlap.length > 0) {
      return `includedTechCategoryList and excludedTechCategoryList share conflicting values: ${overlap.join(", ")}`;
    }
  }

  if (body.minNumberOfTech !== undefined) {
    if (!Number.isInteger(body.minNumberOfTech) || body.minNumberOfTech < 0) {
      return "minNumberOfTech must be a non-negative whole number";
    }
  }

  if (body.maxNumberOfTech !== undefined) {
    if (!Number.isInteger(body.maxNumberOfTech) || body.maxNumberOfTech < 0) {
      return "maxNumberOfTech must be a non-negative whole number";
    }
  }

  if (
    body.minNumberOfTech !== undefined &&
    body.maxNumberOfTech !== undefined &&
    body.minNumberOfTech > body.maxNumberOfTech
  ) {
    return "minNumberOfTech must be <= maxNumberOfTech";
  }

  if (body.skip !== undefined) {
    if (!Number.isInteger(body.skip) || body.skip < 0) {
      return "skip must be a non-negative integer if provided";
    }
  }

  if (body.limit !== undefined) {
    if (!Number.isInteger(body.limit) || body.limit < 0) {
      return "limit must be a non-negative integer if provided";
    }
  }

  return null;
}

function buildSearchCondition(searchStr: string, params: string[]): string {
  const lower = searchStr.toLowerCase().trim();
  const MIN_CHUNK_SIZE = 4;
  const chunkSize = Math.max(lower.length - 2, MIN_CHUNK_SIZE);

  let chunks: string[];

  if (lower.length <= MIN_CHUNK_SIZE) {
    chunks = [lower];
  } else {
    chunks = [
      ...new Set(
        Array.from({ length: lower.length - chunkSize + 1 }, (_, i) =>
          lower.slice(i, i + chunkSize),
        ),
      ),
    ];
  }

  chunks.forEach((chunk) => params.push(`%${chunk}%`, `%${chunk}%`));

  const clauses = chunks
    .map(() => "(LOWER(domain) LIKE ? OR LOWER(companyName) LIKE ?)")
    .join(" OR ");

  return `(${clauses})`;
}

function buildAllowedQuery(body: RequestBody): {
  sql: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (body.searchStr) {
    const searchParams: string[] = [];
    conditions.push(buildSearchCondition(body.searchStr, searchParams));
    params.push(...searchParams);
  }

  if (body.countries?.length) {
    const values = body.countries.map((v) => v.toLowerCase());
    conditions.push(`LOWER(country) IN (${values.map(() => "?").join(", ")})`);
    params.push(...values);
  }

  if (body.companyCategories?.length) {
    const values = body.companyCategories.map((v) => v.toLowerCase());
    conditions.push(
      `LOWER(companyCategory) IN (${values.map(() => "?").join(", ")})`,
    );
    params.push(...values);
  }

  if (body.includedTechList?.length) {
    const values = body.includedTechList.map((v) => v.toLowerCase());
    conditions.push(
      `domain IN (SELECT DISTINCT domain FROM companies WHERE LOWER(tech) IN (${values.map(() => "?").join(", ")}))`,
    );
    params.push(...values);
  }

  if (body.includedTechCategoryList?.length) {
    const values = body.includedTechCategoryList.map((v) => v.toLowerCase());
    conditions.push(
      `domain IN (SELECT DISTINCT domain FROM companies WHERE LOWER(techCategory) IN (${values.map(() => "?").join(", ")}))`,
    );
    params.push(...values);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const havingClauses: string[] = [];

  if (body.minNumberOfTech !== undefined) {
    havingClauses.push(
      `COUNT(DISTINCT CASE WHEN tech IS NOT NULL THEN tech END) >= ?`,
    );
    params.push(body.minNumberOfTech);
  }

  if (body.maxNumberOfTech !== undefined) {
    havingClauses.push(
      `COUNT(DISTINCT CASE WHEN tech IS NOT NULL THEN tech END) <= ?`,
    );
    params.push(body.maxNumberOfTech);
  }

  const havingClause =
    havingClauses.length > 0 ? `HAVING ${havingClauses.join(" AND ")}` : "";

  const sql = `
    SELECT domain
    FROM companies
    ${whereClause}
    GROUP BY domain
    ${havingClause}
  `.trim();

  return { sql, params };
}

function buildExcludedQuery(body: RequestBody): {
  sql: string;
  params: string[];
} | null {
  if (
    !body.excludedTechList?.length &&
    !body.excludedTechCategoryList?.length
  ) {
    return null;
  }

  const conditions: string[] = [];
  const params: string[] = [];

  if (body.excludedTechList?.length) {
    const values = body.excludedTechList.map((v) => v.toLowerCase());
    conditions.push(`LOWER(tech) IN (${values.map(() => "?").join(", ")})`);
    params.push(...values);
  }

  if (body.excludedTechCategoryList?.length) {
    const values = body.excludedTechCategoryList.map((v) => v.toLowerCase());
    conditions.push(
      `LOWER(techCategory) IN (${values.map(() => "?").join(", ")})`,
    );
    params.push(...values);
  }

  const sql = `
    SELECT DISTINCT domain
    FROM companies
    WHERE ${conditions.join(" OR ")}
  `.trim();

  return { sql, params };
}

function buildDataQuery(domains: string[]): {
  sql: string;
  params: string[];
} | null {
  if (!domains?.length) {
    return null;
  }

  const params = domains;

  const sql = `
    SELECT
      domain,
      companyName,
      companyCategory,
      city,
      state,
      zipcode,
      country,
      JSON_GROUP_ARRAY(DISTINCT tech) AS tech,
      JSON_GROUP_ARRAY(DISTINCT techCategory) AS techCategory
    FROM companies
    WHERE domain IN (${domains.map(() => "?").join(", ")})
    GROUP BY domain
    ORDER BY LOWER(domain) ASC
  `.trim();

  return { sql, params };
}

export async function POST(req: NextRequest) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logger.info(
    `api/get-companies route POST() called args=${JSON.stringify(body)}`,
  );

  const validationError = validate(body);
  if (validationError) {
    logger.warn(
      `api/get-companies route POST() validation failed error="${validationError}"`,
    );
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const db = getDb();

    const allowedQuery = buildAllowedQuery(body);
    logger.debug(
      `api/get-companies route POST() allowedDomains sql="${allowedQuery.sql}" params=${JSON.stringify(allowedQuery.params)}`,
    );
    const allowedDomains = (
      db.prepare(allowedQuery.sql).all(...allowedQuery.params) as {
        domain: string;
      }[]
    ).map((r) => r.domain);

    let excludedDomains: string[] = [];
    const excludedQuery = buildExcludedQuery(body);
    if (excludedQuery) {
      logger.debug(
        `api/get-companies route POST() excludedDomains sql="${excludedQuery.sql}" params=${JSON.stringify(excludedQuery.params)}`,
      );
      excludedDomains = (
        db.prepare(excludedQuery.sql).all(...excludedQuery.params) as {
          domain: string;
        }[]
      ).map((r) => r.domain);
    }

    const excludedSet = new Set(excludedDomains);
    const domains = allowedDomains.filter((d) => !excludedSet.has(d));

    logger.info(
      `api/get-companies route POST() success args={ allowed: ${allowedDomains.length}, excluded: ${excludedDomains.length}, result: ${domains.length} }`,
    );

    let data: Data[] = [];
    const dataQuery = buildDataQuery(domains);
    if (dataQuery) {
      logger.debug(
        `api/get-companies route POST() data sql="${dataQuery.sql}" params=${JSON.stringify(dataQuery.params)}`,
      );
      data = (
        db.prepare(dataQuery.sql).all(...dataQuery.params) as Data[]
      )?.map(
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
        }) => ({
          domain,
          ...(typeof companyName === "string" &&
            companyName?.trim() && { companyName: companyName?.trim() }),
          ...(typeof companyCategory === "string" &&
            companyCategory?.trim() && {
              companyCategory: companyCategory?.trim(),
            }),
          ...(typeof city === "string" &&
            city?.trim() && { city: city?.trim() }),
          ...(typeof state === "string" &&
            state?.trim() && { state: state?.trim() }),
          ...(typeof zipcode === "string" &&
            zipcode?.trim() && { zipcode: zipcode?.trim() }),
          ...(typeof country === "string" &&
            country?.trim() && { country: country?.trim() }),
          ...(typeof tech === "string" && {
            tech: JSON.parse(tech)?.filter(Boolean),
          }),
          ...(typeof techCategory === "string" && {
            techCategory: JSON.parse(techCategory)?.filter(Boolean),
          }),
        }),
      );
    }

    const skip = body.skip ?? 0;
    const limit = body.limit ?? 10;
    const totalCount = data.length;
    const paginatedData = data.slice(skip, skip + limit);

    logger.info(
      `api/get-companies route POST() pagination applied skip=${skip} limit=${limit} totalCount=${totalCount} returnedCount=${paginatedData.length}`,
    );

    return NextResponse.json({
      totalCount,
      domains: data?.map(({ domain }) => domain),
      data: paginatedData,
    });
  } catch (error) {
    logger.error(
      `api/get-companies route POST() failed error=${JSON.stringify(error)}`,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
