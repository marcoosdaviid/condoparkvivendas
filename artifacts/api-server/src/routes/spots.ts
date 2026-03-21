import { Router, type IRouter } from "express";
import { eq, and, ne, or, sql } from "drizzle-orm";
import { db, parkingSpotsTable, usersTable } from "@workspace/db";
import {
  CreateSpotBody,
  RemoveSpotParams,
  RemoveSpotResponse,
  GetAvailableSpotsResponse,
  ApproveBookingQueryParams,
  ApproveBookingResponse,
  ExpressInterestParams,
  ExpressInterestBody,
  ExpressInterestResponse,
  ConfirmOccupationParams,
  ConfirmOccupationBody,
  ConfirmOccupationResponse,
  VacateSpotParams,
  VacateSpotResponse,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function todayDayOfWeek(): string {
  return DAYS[new Date().getDay()];
}

// Helper: fetch a full spot row with user + interested user info
async function selectFullSpot(id: number) {
  const [row] = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      spotType: parkingSpotsTable.spotType,
      daysOfWeek: parkingSpotsTable.daysOfWeek,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      status: parkingSpotsTable.status,
      interestedUserId: parkingSpotsTable.interestedUserId,
      approvalToken: parkingSpotsTable.approvalToken,
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

// GET /spots — spots for today (one-time + recurring)
router.get("/spots", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const dow = todayDayOfWeek();

  const rows = await db
    .select({
      id: parkingSpotsTable.id,
      userId: parkingSpotsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      spotType: parkingSpotsTable.spotType,
      daysOfWeek: parkingSpotsTable.daysOfWeek,
      availableFrom: parkingSpotsTable.availableFrom,
      availableUntil: parkingSpotsTable.availableUntil,
      date: parkingSpotsTable.date,
      status: parkingSpotsTable.status,
      interestedUserId: parkingSpotsTable.interestedUserId,
      approvalToken: parkingSpotsTable.approvalToken,
      occupantName: parkingSpotsTable.occupantName,
      occupantApartment: parkingSpotsTable.occupantApartment,
      carPlate: parkingSpotsTable.carPlate,
      expectedExitTime: parkingSpotsTable.expectedExitTime,
      createdAt: parkingSpotsTable.createdAt,
    })
    .from(parkingSpotsTable)
    .innerJoin(usersTable, eq(parkingSpotsTable.userId, usersTable.id))
    .where(
      or(
        // ONE_TIME spots for today
        and(
          eq(parkingSpotsTable.spotType, "ONE_TIME"),
          eq(parkingSpotsTable.date, today)
        ),
        // RECURRING spots for today's day of week
        and(
          eq(parkingSpotsTable.spotType, "RECURRING"),
          sql`${dow} = ANY(${parkingSpotsTable.daysOfWeek})`
        )
      )
    )
    .orderBy(parkingSpotsTable.createdAt);

  // Auto-reset RECURRING FINISHED spots (they renew each day)
  const resetIds: number[] = [];
  for (const row of rows) {
    if (row.spotType === "RECURRING" && row.status === "FINISHED") {
      resetIds.push(row.id);
    }
  }
  if (resetIds.length > 0) {
    for (const id of resetIds) {
      await db
        .update(parkingSpotsTable)
        .set({
          status: "AVAILABLE",
          interestedUserId: null,
          approvalToken: null,
          occupantName: null,
          occupantApartment: null,
          carPlate: null,
          expectedExitTime: null,
        })
        .where(eq(parkingSpotsTable.id, id));
    }
  }

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const isReset = resetIds.includes(row.id);
      const effectiveStatus = isReset ? "AVAILABLE" : row.status;

      let interestedUserName: string | null = null;
      let interestedUserPhone: string | null = null;
      let interestedUserApartment: string | null = null;

      if (!isReset && row.interestedUserId) {
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

      return {
        ...row,
        status: effectiveStatus,
        interestedUserId: isReset ? null : row.interestedUserId,
        approvalToken: isReset ? null : row.approvalToken,
        occupantName: isReset ? null : row.occupantName,
        occupantApartment: isReset ? null : row.occupantApartment,
        carPlate: isReset ? null : row.carPlate,
        expectedExitTime: isReset ? null : row.expectedExitTime,
        interestedUserName,
        interestedUserPhone,
        interestedUserApartment,
      };
    })
  );

  res.json(GetAvailableSpotsResponse.parse(enriched));
});

// POST /spots — create one-time or recurring spot
router.post("/spots", async (req, res): Promise<void> => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const spotType = parsed.data.spotType ?? "ONE_TIME";
  const dow = todayDayOfWeek();

  // Validate that the user has registered their parking spot number
  const [owner] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.userId))
    .limit(1);

  if (!owner) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  if (!owner.parkingSpotNumber) {
    res.status(400).json({ error: "Cadastre o número da sua vaga para compartilhar disponibilidade" });
    return;
  }

  // Check for an existing active spot of any type today
  const allActiveSpots = await db
    .select()
    .from(parkingSpotsTable)
    .where(
      and(
        eq(parkingSpotsTable.userId, parsed.data.userId),
        ne(parkingSpotsTable.status, "FINISHED")
      )
    );

  const hasConflict = allActiveSpots.some((s) => {
    if (s.spotType === "ONE_TIME") return s.date === today;
    if (s.spotType === "RECURRING") {
      const days = s.daysOfWeek ?? [];
      return days.includes(dow);
    }
    return false;
  });

  if (hasConflict) {
    res.status(409).json({ error: "Você já tem uma vaga anunciada hoje" });
    return;
  }

  const [spot] = await db
    .insert(parkingSpotsTable)
    .values({
      userId: parsed.data.userId,
      spotType,
      daysOfWeek: spotType === "RECURRING" ? (parsed.data.daysOfWeek ?? []) : null,
      availableFrom: parsed.data.availableFrom,
      availableUntil: parsed.data.availableUntil,
      date: spotType === "ONE_TIME" ? (parsed.data.date ?? today) : null,
      status: "AVAILABLE",
    })
    .returning();

  const full = await selectFullSpot(spot.id);
  res.status(201).json(full);
});

// GET /spots/approve — approve booking via token (WhatsApp link)
router.get("/spots/approve", async (req, res): Promise<void> => {
  const parsed = ApproveBookingQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }

  const { spotId, token } = parsed.data;

  const [spot] = await db
    .select()
    .from(parkingSpotsTable)
    .where(eq(parkingSpotsTable.id, spotId));

  if (!spot) {
    res.status(404).json({ error: "Vaga não encontrada" });
    return;
  }

  if (spot.status !== "PENDING_CONFIRMATION") {
    res.status(400).json({ error: "Esta vaga não está aguardando aprovação" });
    return;
  }

  if (spot.approvalToken !== token) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }

  if (!spot.interestedUserId) {
    res.status(400).json({ error: "Sem usuário interessado" });
    return;
  }

  // Look up requester details
  const [requester] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, spot.interestedUserId));

  if (!requester) {
    res.status(404).json({ error: "Usuário interessado não encontrado" });
    return;
  }

  await db
    .update(parkingSpotsTable)
    .set({
      status: "OCCUPIED",
      approvalToken: null,
      occupantName: requester.name,
      occupantApartment: requester.apartment,
      carPlate: requester.carPlate ?? "Não informada",
      expectedExitTime: spot.availableUntil,
    })
    .where(eq(parkingSpotsTable.id, spotId));

  const full = await selectFullSpot(spotId);
  res.json(ApproveBookingResponse.parse(full));
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

  // Validate interested user has verified phone and car plate
  const [interestedUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, body.data.interestedUserId));

  if (!interestedUser) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  if (!interestedUser.carPlate) {
    res.status(400).json({ error: "Cadastre sua placa para solicitar vagas" });
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

  const approvalToken = crypto.randomUUID();

  await db
    .update(parkingSpotsTable)
    .set({
      status: "PENDING_CONFIRMATION",
      interestedUserId: body.data.interestedUserId,
      approvalToken,
    })
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
      approvalToken: null,
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

  const now = new Date();
  const [nowH, nowM] = [now.getHours(), now.getMinutes()];
  const [untilH, untilM] = spot.availableUntil.split(":").map(Number);
  const stillInWindow = nowH < untilH || (nowH === untilH && nowM < untilM);

  // RECURRING spots always go back to AVAILABLE (resets for next use)
  const newStatus = spot.spotType === "RECURRING" ? "AVAILABLE" : (stillInWindow ? "AVAILABLE" : "FINISHED");

  await db
    .update(parkingSpotsTable)
    .set({
      status: newStatus,
      interestedUserId: null,
      approvalToken: null,
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
