import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";

let databaseInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getDb = () => {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before database access is enabled.");
  }

  const connection = postgres(process.env.DATABASE_URL, {
    prepare: false,
  });

  databaseInstance = drizzle(connection, { schema });

  return databaseInstance;
};
