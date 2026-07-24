import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, "../../../apps/web/.env.local");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
const dbUrl = match ? match[1]!.replace(/^["']|["']$/g, "") : "";
if (!dbUrl) throw new Error("DATABASE_URL not found");

const sql = postgres(dbUrl);

await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS district varchar(100)`;
console.log("✅ district column added to customers");

await sql.end();
