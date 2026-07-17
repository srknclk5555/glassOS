import postgres from "postgres";
const sql = postgres("postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require");
const users = await sql`SELECT id, email, name, role_id, password_hash FROM users`;
console.log(JSON.stringify(users, null, 2));
const roles = await sql`SELECT id, name FROM roles`;
console.log("Roles:", JSON.stringify(roles, null, 2));
await sql.end();
