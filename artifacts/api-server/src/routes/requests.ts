import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, spotRequestsTable, usersTable } from "@workspace/db";
import {
  CreateSpotRequestBody,
  OfferSpotForRequestParams,
  OfferSpotForRequestBody,
  DeleteSpotRequestParams,
  GetSpotRequestsResponse,
  DeleteSpotRequestResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const selectFullRequest = async (id: number) => {
  const requester = db.select().from(usersTable).where(eq(usersTable.id, spotRequestsTable.userId)).limit(1).as("requester");

  const [row] = await db
    .select({
      id: spotRequestsTable.id,
      userId: spotRequestsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      date: spotRequestsTable.date,
      startTime: spotRequestsTable.startTime,
      endTime: spotRequestsTable.endTime,
      reason: spotRequestsTable.reason,
      status: spotRequestsTable.status,
      offeredByUserId: spotRequestsTable.offeredByUserId,
      createdAt: spotRequestsTable.createdAt,
    })
    .from(spotRequestsTable)
    .innerJoin(usersTable, eq(spotRequestsTable.userId, usersTable.id))
    .where(eq(spotRequestsTable.id, id));

  if (!row) return null;

  let offeredByUserName: string | null = null;
  let offeredByUserPhone: string | null = null;
  let offeredByUserApartment: string | null = null;

  if (row.offeredByUserId) {
    const [offerer] = await db
      .select({ name: usersTable.name, phone: usersTable.phone, apartment: usersTable.apartment })
      .from(usersTable)
      .where(eq(usersTable.id, row.offeredByUserId));
    if (offerer) {
      offeredByUserName = offerer.name;
      offeredByUserPhone = offerer.phone;
      offeredByUserApartment = offerer.apartment;
    }
  }

  return { ...row, offeredByUserName, offeredByUserPhone, offeredByUserApartment };
};

router.get("/requests", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: spotRequestsTable.id,
      userId: spotRequestsTable.userId,
      userName: usersTable.name,
      userApartment: usersTable.apartment,
      userPhone: usersTable.phone,
      date: spotRequestsTable.date,
      startTime: spotRequestsTable.startTime,
      endTime: spotRequestsTable.endTime,
      reason: spotRequestsTable.reason,
      status: spotRequestsTable.status,
      offeredByUserId: spotRequestsTable.offeredByUserId,
      createdAt: spotRequestsTable.createdAt,
    })
    .from(spotRequestsTable)
    .innerJoin(usersTable, eq(spotRequestsTable.userId, usersTable.id))
    .orderBy(spotRequestsTable.createdAt);

  const enriched = await Promise.all(
    rows.map(async (row) => {
      let offeredByUserName: string | null = null;
      let offeredByUserPhone: string | null = null;
      let offeredByUserApartment: string | null = null;

      if (row.offeredByUserId) {
        const [offerer] = await db
          .select({ name: usersTable.name, phone: usersTable.phone, apartment: usersTable.apartment })
          .from(usersTable)
          .where(eq(usersTable.id, row.offeredByUserId));
        if (offerer) {
          offeredByUserName = offerer.name;
          offeredByUserPhone = offerer.phone;
          offeredByUserApartment = offerer.apartment;
        }
      }

      return { ...row, offeredByUserName, offeredByUserPhone, offeredByUserApartment };
    })
  );

  res.json(GetSpotRequestsResponse.parse(enriched));
});

router.post("/requests", async (req, res): Promise<void> => {
  const parsed = CreateSpotRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inserted] = await db
    .insert(spotRequestsTable)
    .values({
      userId: parsed.data.userId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      reason: parsed.data.reason ?? null,
      status: "open",
    })
    .returning();

  const full = await selectFullRequest(inserted.id);
  res.status(201).json(full);
});

router.post("/requests/:id/offer", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = OfferSpotForRequestParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = OfferSpotForRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(spotRequestsTable)
    .where(eq(spotRequestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }

  if (existing.status === "matched") {
    res.status(409).json({ error: "Este pedido já foi atendido" });
    return;
  }

  await db
    .update(spotRequestsTable)
    .set({ status: "matched", offeredByUserId: body.data.offeredByUserId })
    .where(eq(spotRequestsTable.id, params.data.id));

  const full = await selectFullRequest(params.data.id);
  res.json(full);
});

router.delete("/requests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSpotRequestParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(spotRequestsTable)
    .where(eq(spotRequestsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }

  res.json(DeleteSpotRequestResponse.parse({ message: "Pedido removido com sucesso" }));
});

export default router;
