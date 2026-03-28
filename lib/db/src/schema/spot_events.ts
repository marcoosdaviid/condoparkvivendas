import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type SpotEventType = "PERMISSION_GRANTED" | "SPOT_REQUESTED" | "REQUEST_CANCELLED" | "REQUEST_DECLINED";

export const spotEventsTable = pgTable("spot_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'PERMISSION_GRANTED' | 'SPOT_REQUESTED'
  spotId: integer("spot_id").notNull(),
  spotNumber: text("spot_number"), // número da vaga (ex: "32b")
  ownerId: integer("owner_id").references(() => usersTable.id), // dono da vaga
  ownerName: text("owner_name"),
  ownerApartment: text("owner_apartment"),
  requesterId: integer("requester_id").references(() => usersTable.id), // quem pediu
  requesterName: text("requester_name"),
  requesterApartment: text("requester_apartment"),
  date: text("date"), // data da vaga (ex: "2026-03-23")
  availableFrom: text("available_from"), // horário início da vaga
  availableUntil: text("available_until"), // horário fim da vaga (esperado)
  actualExitTime: text("actual_exit_time"), // horário real de saída (quando marcada desocupada)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
