import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  // Step 1: Simulate auth.ts exactly
  const userRows = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_role', 'super_admin', true)`;
    return await tx`
      SELECT id, name, email, tenant_id, role_id, password_hash, active, deleted_at 
      FROM users WHERE email = 'tenant-admin@example.com' LIMIT 1
    `;
  });

  console.log('Step 1 - Rows from transaction:', JSON.stringify(userRows, null, 2));

  if (userRows.length > 0) {
    const user = userRows[0];
    console.log('User found:', user.email);
    console.log('active:', user.active, 'deleted_at:', user.deleted_at);

    // Step 2: Test password
    const passwordMatches = await bcrypt.compare('Test1234!', user.password_hash);
    console.log('Password matches:', passwordMatches);
  } else {
    console.log('USER NOT FOUND - RLS blocking or user missing');
    
    // Step 3: Try without transaction
    const direct = await sql`SELECT id, email FROM users WHERE email = 'tenant-admin@example.com' LIMIT 1`;
    console.log('Direct query (no RLS bypass):', JSON.stringify(direct, null, 2));
  }

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
