import fs from "fs";
import path from "path";
import JSON5 from "json5";
import { getDb } from "./lib/db.js";
import logger from "./lib/logger.js";

type MetaData = {
  domain: string;
  companyName?: string;
  companyCategory?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  techArr?: string[];
};

type OutputRecord = MetaData & {
  tech?: string;
  techCategory?: string;
};

const readFromFile = (
  inputPath: string,
  encoding: BufferEncoding = "utf8",
): string => {
  return fs.readFileSync(path.join(process.cwd(), inputPath), encoding);
};


const ndJsonToSafeJson = <T = any>(content: string): T[] => {
  let lineNumber = 0;

  return content
    ?.split("\n")
    ?.map((line) => {
      lineNumber++;

      const i = line.indexOf("{");
      const j = line.lastIndexOf("}");

      if (i === -1 || j === -1 || j < i) {
        return null;
      }

      const jsonLine = line.slice(i, j + 1);

      try {
        return JSON5.parse(jsonLine) as T;
      } catch (error) {
        logger.error(`setup.ts ndJsonToSafeJson() failed args={ line: ${lineNumber} } error=${JSON.stringify(error)}`);
        return null;
      }
    })
    ?.filter(Boolean) as T[];
};

((): void => {
  logger.info("setup.ts setup() called");
  const metaDataMap: Record<string, MetaData> = {};

  ndJsonToSafeJson<any>(
    readFromFile("src/sample-data/metaData.sample.json", "utf16le"),
  )?.forEach(({ D, C, CAT, ST, CO, Z, CN }) => {
    const domain = D?.toLowerCase()?.trim() ?? "";

    if (!domain) return;

    metaDataMap[domain] = {
      domain,
      companyName: CN?.trim(),
      companyCategory: CAT?.trim(),
      city: C?.trim(),
      state: ST?.trim(),
      country: CO?.toUpperCase()?.trim(),
      zipcode: Z?.trim(),
    };
  });

  const techToCategoryMapping: Record<string, string> = {};

  JSON5.parse(readFromFile("src/sample-data/techIndex.sample.json"))?.forEach(
    ({ Name, Category }: any) => {
      const tech = Name?.trim();
      const cat = Category?.trim();

      if (tech && cat) {
        techToCategoryMapping[tech.toUpperCase()] = cat;
      }
    },
  );

  ndJsonToSafeJson<any>(
    readFromFile("src/sample-data/techData.sample.json", "utf16le"),
  )?.forEach(({ D, T }) => {
    const domain = D?.toLowerCase()?.trim() ?? "";

    if (!domain) return;

    let techArr: string[] | undefined;

    if (Array.isArray(T)) {
      techArr = T?.filter(
        (v): v is { N?: string } =>
          typeof v === "object" && Boolean(v?.N?.trim()),
      )?.map(({ N }) => N!.trim());
    }

    if (!techArr?.length) return;

    if (!metaDataMap[domain]) {
      metaDataMap[domain] = { domain };
    }

    const existingTech = metaDataMap[domain].techArr ?? [];

    metaDataMap[domain].techArr = [...new Set([...existingTech, ...techArr])];
  });

  const parsedData: OutputRecord[] = [];

  Object.values(metaDataMap).forEach(({ techArr, ...data }) => {
    if (techArr?.length) {
      techArr.forEach((t) => {
        const tech = t?.trim();
        const techCategory =
          techToCategoryMapping?.[tech?.toUpperCase()]?.trim() ?? "";

        const record: OutputRecord = {
          ...data,
          tech,
        };

        if (techCategory) {
          record.techCategory = techCategory;
        }

        parsedData.push(record);
      });
    } else {
      parsedData.push({ ...data });
    }
  });

  // writeToFile(parsedData, "src/sample-data/parsedData.output.json");

  // Establish SQLite connection
  const db = getDb();

  // Create companies table matching the DBML schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      domain        TEXT NOT NULL,
      companyName   TEXT,
      companyCategory TEXT,
      city          TEXT,
      state         TEXT,
      country       TEXT,
      zipcode       TEXT,
      tech          TEXT,
      techCategory  TEXT,
      PRIMARY KEY (domain, tech)
    );
    CREATE INDEX IF NOT EXISTS idx_companies_companyCategory ON companies (companyCategory);
    CREATE INDEX IF NOT EXISTS idx_companies_country         ON companies (country);
    CREATE INDEX IF NOT EXISTS idx_companies_tech            ON companies (tech);
    CREATE INDEX IF NOT EXISTS idx_companies_techCategory    ON companies (techCategory);
  `);

  // Insert all parsedData records inside a transaction
  const insert = db.prepare(`
    INSERT INTO companies
      (domain, companyName, companyCategory, city, state, country, zipcode, tech, techCategory)
    VALUES
      (@domain, @companyName, @companyCategory, @city, @state, @country, @zipcode, @tech, @techCategory)
  `);

  const insertAll = db.transaction((records: OutputRecord[]) => {
    for (const record of records) {
      insert.run({
        domain: record.domain,
        companyName: record.companyName ?? null,
        companyCategory: record.companyCategory ?? null,
        city: record.city ?? null,
        state: record.state ?? null,
        country: record.country ?? null,
        zipcode: record.zipcode ?? null,
        tech: record.tech ?? null,
        techCategory: record.techCategory ?? null,
      });
    }
  });

  db.prepare("DELETE FROM companies").run();
  logger.info(`setup.ts setup() inserting args={ records: ${parsedData.length} }`);
  insertAll(parsedData);
  logger.info(`setup.ts setup() done args={ inserted: ${parsedData.length} }`);

})();
