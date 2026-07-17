import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  const tables = ['tenants', 'users', 'roles', 'factories', 'customers', 'materials', 'products'];
  
  const cols = await sql`
    SELECT table_name, column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = ANY('{"tenants","users","roles","factories","customers","materials","products"}')
    ORDER BY table_name, ordinal_position
  `;
  
  console.log(JSON.stringify(cols, null, 2));
  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
