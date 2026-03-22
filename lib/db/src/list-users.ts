import { db, usersTable } from "./index";

async function resetUsers() {
    try {
        await db.delete(usersTable);
        console.log("=== DATABASE RESET SUCCESSFUL ===");
        console.log("All users have been removed.");
        console.log("=================================");
    } catch (err) {
        console.error("Error resetting users:", err);
    } finally {
        process.exit(0);
    }
}

resetUsers();
