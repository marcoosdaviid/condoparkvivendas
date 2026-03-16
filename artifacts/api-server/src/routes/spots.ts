import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, parkingSpotsTable, usersTable } from "@workspace/db";
import { CreateSpotBody, RemoveSpotParams, GetAvailableSpotsResponse, RemoveSpotResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/spots", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const spots = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      createdAt: parkingSpotsTable.createdAt,
    })
    .from(parkingSpotsTable)
    .innerJoin(usersTable, eq(parkingSpotsTable.userId, usersTable.id))
    .where(eq(parkingSpotsTable.date, today))
    .orderBy(parkingSpotsTable.createdAt);

  res.json(GetAvailableSpotsResponse.parse(spots));
});

router.post("/spots", async (req, res): Promise<void> => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const existing = await db
    .select()
    .from(parkingSpotsTable)
    .where(
      and(
        eq(parkingSpotsTable.userId, parsed.data.userId),
        eq(parkingSpotsTable.date, today)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "You already have a spot listed for today" });
    return;
  }

  const [spot] = await db
    .insert(parkingSpotsTable)
    .values({
      userId: parsed.data.userId,
      availableFrom: parsed.data.availableFrom,
      availableUntil: parsed.data.availableUntil,
      date: today,
    })
    .returning();

  const [fullSpot] = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      createdAt: parkingSpotsTable.createdAt,
    })
    .from(parkingSpotsTable)
    .innerJoin(usersTable, eq(parkingSpotsTable.userId, usersTable.id))
    .where(eq(parkingSpotsTable.id, spot.id));

  res.status(201).json(fullSpot);
});

router.delete("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RemoveSpotParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(parkingSpotsTable)
    .where(eq(parkingSpotsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }

  res.json(RemoveSpotResponse.parse({ message: "Spot removed successfully" }));
});

export default router;
