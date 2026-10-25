import Database from "better-sqlite3";
import path from "path";
import logger from "./logger";

const DB_PATH = path.join(process.cwd(), "companies.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    logger.info(`db.ts getDb() called args={ path: "${DB_PATH}" }`);
    _db = new Database(DB_PATH);
    logger.info("db.ts getDb() connection established");
  }
  return _db;
}
