import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
(async function(){
  try{
    const url = process.env.DATABASE_URL;
    if(!url){ console.error('DATABASE_URL not set'); process.exit(1); }
    const sql = postgres(url, { ssl: 'require' });
    const rows = await sql`select id,email,password_hash,active,deleted_at from users where email='tenant-admin@example.com'`;
    fs.writeFileSync('.tmp/user.json', JSON.stringify(rows, null, 2));
    await sql.end();
    console.log('WROTE .tmp/user.json');
  }catch(e){ console.error(e); process.exit(1); }
})();