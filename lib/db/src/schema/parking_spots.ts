import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const parkingSpotsTable = pgTable("parking_spots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  spotType: text("spot_type").notNull().default("ONE_TIME"),
  daysOfWeek: text("days_of_week").array(),
  availableFrom: text("available_from").notNull(),
  availableUntil: text("available_until").notNull(),
  date: text("date"),
  status: text("status").notNull().default("AVAILABLE"),
  interestedUserId: integer("interested_user_id").references(() => usersTable.id),
  approvalToken: text("approval_token"),
  occupantName: text("occupant_name"),
  occupantApartment: text("occupant_apartment"),
  carPlate: text("car_plate"),
  expectedExitTime: text("expected_exit_time"),
  requestedDays: text("requested_days").array(),
  requestedFrom: text("requested_from"),
  requestedUntil: text("requested_until"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const insertParkingSpotSchema = createInsertSchema(parkingSpotsTable).omit({ id: true, createdAt: true });
export type InsertParkingSpot = z.infer<typeof insertParkingSpotSchema>;
export type ParkingSpot = typeof parkingSpotsTable.$inferSelect;
