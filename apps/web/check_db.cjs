const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customer_contacts' 
    ORDER BY ordinal_position
  `;
  console.log('customer_contacts columns:');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  
  // Also check delivery_points
  const dp_cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_points' 
    ORDER BY ordinal_position
  `;
  console.log('\ndelivery_points columns:');
  dp_cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  await sql.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
