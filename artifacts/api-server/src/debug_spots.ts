
import { PGlite } from "@electric-sql/pglite";
import path from "path";

async function run() {
  const dbPath = path.resolve(process.cwd(), "../../local-dev/data");
  const client = new PGlite(dbPath);
  
  const userRes = await client.query("SELECT id, name, apartment, phone FROM users;");
  console.log("=== USERS ===");
  console.log(JSON.stringify(userRes.rows, null, 2));

  const spotRes = await client.query("SELECT id, user_id, spot_type, available_until, status FROM parking_spots;");
  console.log("=== SPOTS ===");
  console.log(JSON.stringify(spotRes.rows, null, 2));
}

run();
