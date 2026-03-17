import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const spotRequestsTable = pgTable("spot_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("open"),
  offeredByUserId: integer("offered_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpotRequestSchema = createInsertSchema(spotRequestsTable).omit({ id: true, createdAt: true });
export type InsertSpotRequest = z.infer<typeof insertSpotRequestSchema>;
export type SpotRequest = typeof spotRequestsTable.$inferSelect;
