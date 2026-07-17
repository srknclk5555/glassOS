import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  const tenants = await sql`select id, name from tenants limit 5`;
  console.log('tenants', JSON.stringify(tenants, null, 2));
  const roles = await sql`select id, name from roles where name in ('tenant_admin', 'super_admin') limit 5`;
  console.log('roles', JSON.stringify(roles, null, 2));
  const existingUser = await sql`select id, email, tenant_id, role_id, active from users limit 20`;
  console.log('existingUsers', JSON.stringify(existingUser, null, 2));

  const email = 'tenant-admin@example.com';
  const existingByEmail = await sql`select id from users where email = ${email}`;
  if (existingByEmail.length === 0) {
    if (tenants.length === 0) {
      throw new Error('No tenants available to create user');
    }
    const tenantId = tenants[0].id;
    let roleId = roles.find((r: any) => r.name === 'tenant_admin')?.id;
    if (!roleId) {
      const roleResult = await sql`insert into roles (id, name, description, created_at, updated_at) values (gen_random_uuid(), 'tenant_admin', 'Tenant admin role', now(), now()) returning id`;
      roleId = roleResult[0].id;
    }
    const passwordHash = await bcrypt.hash('Test1234!', 12);
    const userResult = await sql`insert into users (id, tenant_id, role_id, name, email, password_hash, active, created_at, updated_at) values (gen_random_uuid(), ${tenantId}, ${roleId}, 'Tenant Admin', ${email}, ${passwordHash}, true, now(), now()) returning id`;
    console.log('Created user', JSON.stringify(userResult, null, 2));
    console.log('Login with email', email, 'password Test1234!');
  } else {
    console.log('User already exists for email', email, JSON.stringify(existingByEmail, null, 2));
  }

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
