import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, parkingSpotsTable, usersTable } from "@workspace/db";
import {
  CreateSpotBody,
  RemoveSpotParams,
  RemoveSpotResponse,
  GetAvailableSpotsResponse,
  ExpressInterestParams,
  ExpressInterestBody,
  ExpressInterestResponse,
  ConfirmOccupationParams,
  ConfirmOccupationBody,
  ConfirmOccupationResponse,
  VacateSpotParams,
  VacateSpotResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper: fetch a full spot row with user + interested user info
async function selectFullSpot(id: number) {
  const [row] = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      status: parkingSpotsTable.status,
      interestedUserId: parkingSpotsTable.interestedUserId,
      occupantName: parkingSpotsTable.occupantName,
      occupantApartment: parkingSpotsTable.occupantApartment,
      carPlate: parkingSpotsTable.carPlate,
      expectedExitTime: parkingSpotsTable.expectedExitTime,
      createdAt: parkingSpotsTable.createdAt,
    })
    .from(parkingSpotsTable)
    .innerJoin(usersTable, eq(parkingSpotsTable.userId, usersTable.id))
    .where(eq(parkingSpotsTable.id, id));

  if (!row) return null;

  let interestedUserName: string | null = null;
  let interestedUserPhone: string | null = null;
  let interestedUserApartment: string | null = null;

  if (row.interestedUserId) {
    const [u] = await db
      .select({ name: usersTable.name, phone: usersTable.phone, apartment: usersTable.apartment })
      .from(usersTable)
      .where(eq(usersTable.id, row.interestedUserId));
    if (u) {
      interestedUserName = u.name;
      interestedUserPhone = u.phone;
      interestedUserApartment = u.apartment;
    }
  }

  return { ...row, interestedUserName, interestedUserPhone, interestedUserApartment };
}

// GET /spots — all spots for today
router.get("/spots", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      status: parkingSpotsTable.status,
      interestedUserId: parkingSpotsTable.interestedUserId,
      occupantName: parkingSpotsTable.occupantName,
      occupantApartment: parkingSpotsTable.occupantApartment,
      carPlate: parkingSpotsTable.carPlate,
      expectedExitTime: parkingSpotsTable.expectedExitTime,
      createdAt: parkingSpotsTable.createdAt,
    })
    .from(parkingSpotsTable)
    .innerJoin(usersTable, eq(parkingSpotsTable.userId, usersTable.id))
    .where(eq(parkingSpotsTable.date, today))
    .orderBy(parkingSpotsTable.createdAt);

  const enriched = await Promise.all(
    rows.map(async (row) => {
      let interestedUserName: string | null = null;
      let interestedUserPhone: string | null = null;
      let interestedUserApartment: string | null = null;

      if (row.interestedUserId) {
        const [u] = await db
          .select({ name: usersTable.name, phone: usersTable.phone, apartment: usersTable.apartment })
          .from(usersTable)
          .where(eq(usersTable.id, row.interestedUserId));
        if (u) {
          interestedUserName = u.name;
          interestedUserPhone = u.phone;
          interestedUserApartment = u.apartment;
        }
      }

      return { ...row, interestedUserName, interestedUserPhone, interestedUserApartment };
    })
  );

  res.json(GetAvailableSpotsResponse.parse(enriched));
});

// POST /spots — create with status AVAILABLE
router.post("/spots", async (req, res): Promise<void> => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Only block if there's an active (non-FINISHED) spot today
  const existing = await db
    .select()
    .from(parkingSpotsTable)
    .where(
      and(
        eq(parkingSpotsTable.userId, parsed.data.userId),
        eq(parkingSpotsTable.date, today),
        ne(parkingSpotsTable.status, "FINISHED")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Você já tem uma vaga anunciada hoje" });
    return;
  }

  const [spot] = await db
    .insert(parkingSpotsTable)
    .values({
      userId: parsed.data.userId,
      availableFrom: parsed.data.availableFrom,
      availableUntil: parsed.data.availableUntil,
      date: today,
      status: "AVAILABLE",
    })
    .returning();

  const full = await selectFullSpot(spot.id);
  res.status(201).json(full);
});

// DELETE /spots/:id
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
    res.status(404).json({ error: "Vaga não encontrada" });
    return;
  }

  res.json(RemoveSpotResponse.parse({ message: "Vaga removida com sucesso" }));
});

// POST /spots/:id/interest — AVAILABLE -> PENDING_CONFIRMATION
router.post("/spots/:id/interest", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ExpressInterestParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ExpressInterestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [spot] = await db
    .select()
    .from(parkingSpotsTable)
    .where(eq(parkingSpotsTable.id, params.data.id));

  if (!spot) {
    res.status(404).json({ error: "Vaga não encontrada" });
    return;
  }

  if (spot.status !== "AVAILABLE") {
    res.status(409).json({ error: "Esta vaga não está mais disponível" });
    return;
  }

  await db
    .update(parkingSpotsTable)
    .set({ status: "PENDING_CONFIRMATION", interestedUserId: body.data.interestedUserId })
    .where(eq(parkingSpotsTable.id, params.data.id));

  const full = await selectFullSpot(params.data.id);
  res.json(ExpressInterestResponse.parse(full));
});

// POST /spots/:id/confirm — PENDING_CONFIRMATION -> OCCUPIED
router.post("/spots/:id/confirm", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ConfirmOccupationParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ConfirmOccupationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [spot] = await db
    .select()
    .from(parkingSpotsTable)
    .where(eq(parkingSpotsTable.id, params.data.id));

  if (!spot) {
    res.status(404).json({ error: "Vaga não encontrada" });
    return;
  }

  if (spot.status !== "PENDING_CONFIRMATION") {
    res.status(409).json({ error: "A vaga não está aguardando confirmação" });
    return;
  }

  await db
    .update(parkingSpotsTable)
    .set({
      status: "OCCUPIED",
      occupantName: body.data.occupantName,
      occupantApartment: body.data.occupantApartment,
      carPlate: body.data.carPlate,
      expectedExitTime: body.data.expectedExitTime,
    })
    .where(eq(parkingSpotsTable.id, params.data.id));

  const full = await selectFullSpot(params.data.id);
  res.json(ConfirmOccupationResponse.parse(full));
});

// POST /spots/:id/vacate — OCCUPIED -> FINISHED or AVAILABLE
router.post("/spots/:id/vacate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = VacateSpotParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [spot] = await db
    .select()
    .from(parkingSpotsTable)
    .where(eq(parkingSpotsTable.id, params.data.id));

  if (!spot) {
    res.status(404).json({ error: "Vaga não encontrada" });
    return;
  }

  if (spot.status !== "OCCUPIED") {
    res.status(409).json({ error: "A vaga não está ocupada" });
    return;
  }

  // If availableUntil hasn't passed yet → back to AVAILABLE, else FINISHED
  const now = new Date();
  const [nowH, nowM] = [now.getHours(), now.getMinutes()];
  const [untilH, untilM] = spot.availableUntil.split(":").map(Number);
  const stillInWindow = nowH < untilH || (nowH === untilH && nowM < untilM);
  const newStatus = stillInWindow ? "AVAILABLE" : "FINISHED";

  await db
    .update(parkingSpotsTable)
    .set({
      status: newStatus,
      interestedUserId: null,
      occupantName: null,
      occupantApartment: null,
      carPlate: null,
      expectedExitTime: null,
    })
    .where(eq(parkingSpotsTable.id, params.data.id));

  const full = await selectFullSpot(params.data.id);
  res.json(VacateSpotResponse.parse(full));
});

export default router;
