import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

async function main() {
  console.log('=== DEMO VERILER TEMIZLENIYOR ===\n');

  // 1. Order items
  const delItems = await sql`DELETE FROM manufacturing_order_items`;
  console.log(`1. manufacturing_order_items: ${delItems.count} kayit silindi`);

  // 2. Manufacturing orders
  const delOrders = await sql`DELETE FROM manufacturing_orders`;
  console.log(`2. manufacturing_orders: ${delOrders.count} kayit silindi`);

  // 3. Demo recipes (seed ile olusturulan 10 reçete)
  const demoRecipeCodes = [
    '8MM-FUME-TEMP', '6MM-SEFFAF-TEMP', '10MM-BRONZ-TEMP',
    'LAMINE-6MM', 'ISICAM-4-12-4', '12MM-FUME-TEMP',
    'LAKLI-6MM', 'MAVI-6MM-TEMP', 'YESIL-8MM-TEMP', 'AYNA-5MM'
  ];
  const delRecipes = await sql`
    DELETE FROM recipes WHERE recipe_code = ANY(${demoRecipeCodes}::varchar[])
  `;
  console.log(`3. recipes (demo): ${delRecipes.count} kayit silindi`);

  // 4. Demo customers (seed ile olusturulan 3 müsteri)
  const demoCustomerNames = [
    'Mobilya Cam San. A.Ş.',
    'Pencerem PVC Ltd. Şti.',
    'Dekoratif Cam Tic. A.Ş.'
  ];
  const delCustomers = await sql`
    DELETE FROM customers WHERE name = ANY(${demoCustomerNames}::varchar[])
  `;
  console.log(`4. customers (demo): ${delCustomers.count} kayit silindi`);

  // 5. Dogrulama
  console.log('\n=== KALAN VERILER ===');
  const remainingCustomers = await sql`SELECT id, name FROM customers ORDER BY name`;
  console.log(`customers: ${remainingCustomers.length}`);
  for (const c of remainingCustomers) console.log(`  ${c.name}`);

  const remainingRecipes = await sql`SELECT id, recipe_code, name FROM recipes ORDER BY name`;
  console.log(`\nrecipes: ${remainingRecipes.length}`);
  for (const r of remainingRecipes) console.log(`  ${r.recipe_code} -- ${r.name}`);

  const remainingOrders = await sql`SELECT COUNT(*)::int as cnt FROM manufacturing_orders`;
  console.log(`\nmanufacturing_orders: ${remainingOrders[0].cnt}`);

  const remainingItems = await sql`SELECT COUNT(*)::int as cnt FROM manufacturing_order_items`;
  console.log(`manufacturing_order_items: ${remainingItems[0].cnt}`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
