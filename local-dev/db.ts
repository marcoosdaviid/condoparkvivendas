import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "../lib/db/src/schema";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(process.cwd(), "./local-dev/data");
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

export const client = new PGlite(dbPath);
export const db = drizzle(client, { schema });

export * from "../lib/db/src/schema";
