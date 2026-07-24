import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

async function main() {
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'recipes'
  `;
  console.log('RECIPES COLUMNS:', JSON.stringify(cols, null, 2));

  const r = await sql`SELECT id, recipe_code FROM recipes`;
  console.log('RECIPES:', JSON.stringify(r, null, 2));

  const f = await sql`SELECT id, name FROM factories`;
  console.log('FACTORIES:', JSON.stringify(f, null, 2));

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
