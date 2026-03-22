import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      apartment: parsed.data.apartment,
      phone: parsed.data.phone,
      passwordHash,
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

  if (!user.passwordHash) {
    res.status(401).json({ error: "Conta sem senha configurada. Entre em contato com o suporte." });
    return;
  }

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    res.status(401).json({ error: "Senha incorreta." });
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

// GET /users — list all users (Admin)
router.get("/users", async (_req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  res.json(allUsers);
});

// POST /users/admin-login
router.post("/users/admin-login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (username === "mdbestmd" && password === "Pck6486@.asd") {
    // Return a mock admin user or just a success
    // The OpenAPI spec expects a User object, so let's return a dummy admin
    res.json({
      id: 0,
      name: "Administrador",
      phone: "00000000000",
      apartment: "ADM",
      wantsToRequestSpot: false,
      hasParkingSpot: false,
      phoneVerified: true,
      createdAt: new Date().toISOString(),
    });
  } else {
    res.status(401).json({ error: "Credenciais administrativas inválidas" });
  }
});

// DELETE /users/:id (Admin)
router.delete("/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json({ message: "Usuário removido com sucesso" });
});

// POST /users/:id/reset-password (Admin)
router.post("/users/:id/reset-password", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const defaultPassword = "password123"; // Updated to be consistent with common defaults or user preference
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const [updated] = await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json({ message: `Senha resetada com sucesso para: ${defaultPassword}` });
});

export default router;
