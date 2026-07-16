import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../apps/web/.env.local" });

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Please check your environment configuration.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
