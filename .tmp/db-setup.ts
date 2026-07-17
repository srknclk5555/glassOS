import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  console.log('Tables and columns for users and roles:');
  const cols = await sql`select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('tenants','roles','users','materials','products','audit_logs') order by table_name, ordinal_position;`;
  console.log(JSON.stringify(cols, null, 2));

  const userCount = await sql`select count(*) from users`;
  console.log('userCount', JSON.stringify(userCount, null, 2));
  const roleCount = await sql`select count(*) from roles`;
  console.log('roleCount', JSON.stringify(roleCount, null, 2));
  const tenantCount = await sql`select count(*) from tenants`;
  console.log('tenantCount', JSON.stringify(tenantCount, null, 2));

  const existingUser = await sql`select id, email, role_id, tenant_id, active from users limit 1`;
  console.log('existingUser', JSON.stringify(existingUser, null, 2));

  if (Number(userCount[0].count) === 0) {
    console.log('Creating seed tenant and user...');

    const passwordHash = await bcrypt.hash('Test1234!', 12);

    // Use a transaction so set_config bypasses RLS consistently
    await sql.begin(async (tx) => {
      await tx`SELECT set_config('app.current_user_role', 'super_admin', true)`;

      // Re-use existing roles if available, otherwise create tenant_admin
      let roleId;
      const existingRoles = await tx`select id, name from roles`;
      const tenantAdminRole = existingRoles.find((r: any) => r.name === 'tenant_admin');
      if (tenantAdminRole) {
        roleId = tenantAdminRole.id;
        console.log('Using existing tenant_admin role:', roleId);
      } else {
        const roleResult = await tx`insert into roles (id, name, description, created_at, updated_at) values (gen_random_uuid(), 'tenant_admin', 'Tenant admin role', now(), now()) returning id`;
        roleId = roleResult[0].id;
        console.log('Created tenant_admin role:', roleId);
      }

      const tenantResult = await tx`insert into tenants (id, name, subscription_plan, created_at, updated_at) values (gen_random_uuid(), 'Test Tenant', 'trial', now(), now()) returning id`;
      const tenantId = tenantResult[0].id;
      console.log('Created tenant:', tenantId);

      const userResult = await tx`insert into users (id, tenant_id, role_id, name, email, password_hash, active, created_at, updated_at) values (gen_random_uuid(), ${tenantId}, ${roleId}, 'Tenant Admin', 'tenant-admin@example.com', ${passwordHash}, true, now(), now()) returning id`;
      console.log('Created user', JSON.stringify(userResult, null, 2));
    });

    console.log('You can login with email tenant-admin@example.com and password Test1234!');
  } else {
    console.log('Users already exist — skipping seed.');
  }

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
