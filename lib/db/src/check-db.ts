import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
    try {
        const res = await db.execute(sql`SELECT 1`);
        console.log("DB connection OK:", res);
    } catch (err) {
        console.error("DB connection error:", err);
    }
}

main();
