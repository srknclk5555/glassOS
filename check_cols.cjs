const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const result = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'customer_contacts' AND column_name = 'role'
  `;
  console.log('role column exists:', result.length > 0);
  
  const allCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'customer_contacts' 
    ORDER BY ordinal_position
  `;
  console.log('All columns:', allCols.map(c => c.column_name).join(', '));
  
  await sql.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
