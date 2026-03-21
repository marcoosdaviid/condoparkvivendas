import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apartment: text("apartment").notNull(),
  phone: text("phone").notNull().unique(),
  carPlate: text("car_plate"),
  wantsToRequestSpot: boolean("wants_to_request_spot").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  otpCode: text("otp_code"),
  otpExpiry: timestamp("otp_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  otpCode: true,
  otpExpiry: true,
  phoneVerified: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
