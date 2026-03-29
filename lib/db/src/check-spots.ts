import { db } from "./index";
import { parkingSpotsTable } from "./schema";

async function check() {
  console.log("--- Parking Spots Status ---");
  const rows = await db.select().from(parkingSpotsTable);
  console.table(rows.map(r => ({
    id: r.id,
    userId: r.userId,
    type: r.spotType,
    status: r.status,
    interested: r.interestedUserId,
    occupant: r.occupantName,
    until: r.availableUntil,
    exit: r.expectedExitTime
  })));
  process.exit(0);
}

check();
