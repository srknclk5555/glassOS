import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

async function main() {
  const tenants = await sql`SELECT id, name FROM tenants`;
  console.log('TENANTS:', JSON.stringify(tenants, null, 2));

  const customers = await sql`SELECT id, name, customer_code FROM customers`;
  console.log('CUSTOMERS:', JSON.stringify(customers, null, 2));

  const recipes = await sql`SELECT id, recipe_code, recipe_name FROM recipes`;
  console.log('RECIPES:', JSON.stringify(recipes, null, 2));

  const factories = await sql`SELECT id, name FROM factories`;
  console.log('FACTORIES:', JSON.stringify(factories, null, 2));

  const roles = await sql`SELECT id, name FROM roles`;
  console.log('ROLES:', JSON.stringify(roles, null, 2));

  const users = await sql`SELECT id, name, email FROM users`;
  console.log('USERS:', JSON.stringify(users, null, 2));

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
