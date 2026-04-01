
import { db } from "../../../local-dev/db";
import { parkingSpotsTable } from "./schema/parking_spots";

async function listSpots() {
    try {
        const spots = await db.select().from(parkingSpotsTable);
        console.log("=== PARKING SPOTS IN DB ===");
        console.log(JSON.stringify(spots, null, 2));
        console.log("===========================");
    } catch (err) {
        console.error("Error listing spots:", err);
    } finally {
        process.exit(0);
    }
}

listSpots();
