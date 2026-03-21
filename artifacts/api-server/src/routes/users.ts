import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterUserBody,
  LoginUserBody,
  LoginUserResponse,
  SendOtpBody,
  SendOtpResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
  UpdateProfileParams,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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
      phoneVerified: false,
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

router.post("/users/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
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
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const otp = generateOtp();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db
    .update(usersTable)
    .set({ otpCode: otp, otpExpiry: expiry })
    .where(eq(usersTable.id, user.id));

  console.log(`[OTP] Phone: ${parsed.data.phone}, Code: ${otp}`);

  res.json(SendOtpResponse.parse({
    message: "Código enviado com sucesso",
    devOtp: otp,
  }));
});

router.post("/users/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
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
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  if (!user.otpCode || !user.otpExpiry) {
    res.status(400).json({ error: "Nenhum código solicitado. Clique em 'Enviar código' primeiro." });
    return;
  }

  if (new Date() > user.otpExpiry) {
    res.status(400).json({ error: "Código expirado. Solicite um novo." });
    return;
  }

  if (user.otpCode !== parsed.data.code) {
    res.status(400).json({ error: "Código incorreto. Tente novamente." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ phoneVerified: true, otpCode: null, otpExpiry: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(VerifyOtpResponse.parse(updated));
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

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  res.json(UpdateProfileResponse.parse(updated));
});

export default router;
