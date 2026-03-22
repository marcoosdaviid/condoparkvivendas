import { db, usersTable } from "./index";

async function listUsers() {
    try {
        const users = await db.select().from(usersTable);
        console.log("=== USERS IN DATABASE ===");
        console.log(JSON.stringify(users, null, 2));
        console.log("==========================");
    } catch (err) {
        console.error("Error listing users:", err);
    } finally {
        process.exit(0);
    }
}

listUsers();
