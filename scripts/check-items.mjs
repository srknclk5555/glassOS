import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

async function main() {
  // Check a few items
  const items = await sql`
    SELECT id, order_id, recipe_code, quantity, engine_snapshot
    FROM manufacturing_order_items
    LIMIT 5
  `;
  
  for (const item of items) {
    console.log('Item:', item.id);
    console.log('  recipe_code:', item.recipe_code);
    console.log('  quantity:', item.quantity);
    console.log('  engine_snapshot type:', typeof item.engine_snapshot);
    console.log('  engine_snapshot:', JSON.stringify(item.engine_snapshot));
    if (item.engine_snapshot && typeof item.engine_snapshot === 'object') {
      console.log('  totals:', JSON.stringify(item.engine_snapshot.totals));
      console.log('  productionAreaM2:', item.engine_snapshot?.totals?.productionAreaM2);
    }
    console.log('');
  }

  // Test the JSON path query
  const testQuery = await sql`
    SELECT 
      COALESCE(SUM((engine_snapshot->'totals'->>'productionAreaM2')::numeric), 0) as total
    FROM manufacturing_order_items
  `;
  console.log('Total from JSON path:', testQuery[0].total);

  // Test with explicit casting
  const testQuery2 = await sql`
    SELECT 
      SUM(CAST(engine_snapshot->'totals'->>'productionAreaM2' AS numeric)) as total
    FROM manufacturing_order_items
  `;
  console.log('Total from JSON path (explicit cast):', testQuery2[0]?.total);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
