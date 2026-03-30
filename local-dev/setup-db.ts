import { client, db } from "./db";
import { sql } from "drizzle-orm";

async function setup() {
  console.log("Iniciando banco de dados local (PGLite)...");

  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      apartment TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      car_plate TEXT,
      wants_to_request_spot BOOLEAN NOT NULL DEFAULT FALSE,
      has_parking_spot BOOLEAN NOT NULL DEFAULT FALSE,
      parking_spot_number TEXT,
      phone_verified BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parking_spots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      spot_type TEXT NOT NULL DEFAULT 'ONE_TIME',
      days_of_week TEXT[],
      available_from TEXT NOT NULL,
      available_until TEXT NOT NULL,
      date TEXT,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      interested_user_id INTEGER REFERENCES users(id),
      approval_token TEXT,
      occupant_name TEXT,
      occupant_apartment TEXT,
      car_plate TEXT,
      expected_exit_time TEXT,
      requested_days TEXT[],
      requested_from TEXT,
      requested_until TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spot_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      offered_by_user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spot_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      spot_id INTEGER NOT NULL,
      spot_number TEXT,
      owner_id INTEGER REFERENCES users(id),
      owner_name TEXT,
      owner_apartment TEXT,
      requester_id INTEGER REFERENCES users(id),
      requester_name TEXT,
      requester_apartment TEXT,
      date TEXT,
      available_from TEXT,
      available_until TEXT,
      actual_exit_time TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Banco de dados local pronto!");
  process.exit(0);
}

setup().catch(err => {
  console.error("Erro ao configurar banco local:", err);
  process.exit(1);
});
