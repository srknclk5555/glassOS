import 'dotenv/config';
import postgres from 'postgres';

(async function(){
  const url = process.env.DATABASE_URL;
  if(!url){ console.error('DATABASE_URL not set'); process.exit(1); }
  const sql = postgres(url, { ssl: 'require' });
  const rows = await sql`select id,email,tenant_id,role_id,active from users where email = 'tenant-admin@example.com'`;
  console.log('users', JSON.stringify(rows, null, 2));
  await sql.end();
})();