import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterUserBody,
  LoginUserBody,
  LoginUserResponse,
  UpdateProfileParams,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, parsed.data.phone))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Telefone já cadastrado" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      apartment: parsed.data.apartment,
      phone: parsed.data.phone,
      carPlate: parsed.data.carPlate ?? null,
      wantsToRequestSpot: parsed.data.wantsToRequestSpot ?? false,
      hasParkingSpot: parsed.data.hasParkingSpot ?? false,
      parkingSpotNumber: parsed.data.parkingSpotNumber ?? null,
      phoneVerified: true,
    })
    .returning();

  res.status(201).json(LoginUserResponse.parse(user));
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, parsed.data.phone))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Telefone não encontrado. Cadastre-se primeiro." });
    return;
  }

  res.json(LoginUserResponse.parse(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateProfileParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const updates: Partial<typeof existing> = {};
  if (body.data.carPlate !== undefined) updates.carPlate = body.data.carPlate;
  if (body.data.wantsToRequestSpot !== undefined) updates.wantsToRequestSpot = body.data.wantsToRequestSpot;
  if (body.data.hasParkingSpot !== undefined) updates.hasParkingSpot = body.data.hasParkingSpot;
  if (body.data.parkingSpotNumber !== undefined) updates.parkingSpotNumber = body.data.parkingSpotNumber;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  res.json(UpdateProfileResponse.parse(updated));
});

export default router;
