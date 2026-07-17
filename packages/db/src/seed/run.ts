// GlassOS Foundation Seed Script
// Creates: tenant, roles, permissions, role-permissions, factory, admin user, stations, machines
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

// Simple deterministic ULID generator (consistent timestamps for reproducibility)
function makeUlid(seed) {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  // Use a fixed base timestamp so IDs are deterministic
  const baseTime = 1786000000000 + (seed * 1000);
  let id = '';
  let t = baseTime;
  for (let i = 0; i < 10; i++) {
    id = chars[t % 32] + id;
    t = Math.floor(t / 32);
  }
  for (let i = 0; i < 16; i++) {
    id += chars[(seed * 13 + i * 7) % 32];
  }
  return id;
}

const ids = {
  tenant:                makeUlid(1),
  factory:               makeUlid(2),
  roleTenantAdmin:       makeUlid(10),
  roleFactoryAdmin:      makeUlid(11),
  roleOperator:          makeUlid(12),
  permTenantManage:      makeUlid(20),
  permFactoryManage:     makeUlid(21),
  permProductionExecute: makeUlid(22),
  adminUser:             makeUlid(30),
  stationCutting:        makeUlid(40),
  stationGrinding:       makeUlid(41),
  machineCutter:         makeUlid(50),
  machineGrinder:        makeUlid(51),
};

const url = 'postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(url, { ssl: 'require' });

function log(label, id, name) {
  console.log(`  ${label.padEnd(20)} ${id}  ${name}`);
}

async function main() {
  console.log('=== GlassOS Foundation Seed ===\n');
  console.log('Deterministic IDs:');
  Object.entries(ids).forEach(([k, v]) => console.log(`  ${k.padEnd(25)} ${v}`));
  console.log('');

  // We need to bypass RLS during seeding. Approach: set app.current_tenant_id before each insert.
  // For tenant-independent tables (roles, permissions), no RLS.
  // For tenant-scoped tables, we need the session variable set.

  // Phase 1: Insert tenant-independent reference data (no RLS on these tables)
  console.log('--- Phase 1: Roles, Permissions ---');

  // roles
  await sql.unsafe(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [ids.roleTenantAdmin, 'Tenant Admin']);
  log('ROLE', ids.roleTenantAdmin, 'Tenant Admin');
  await sql.unsafe(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [ids.roleFactoryAdmin, 'Factory Admin']);
  log('ROLE', ids.roleFactoryAdmin, 'Factory Admin');
  await sql.unsafe(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [ids.roleOperator, 'Operator']);
  log('ROLE', ids.roleOperator, 'Operator');

  // permissions
  await sql.unsafe(`INSERT INTO permissions (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`, [ids.permTenantManage, 'tenant.manage', 'Manage tenant settings']);
  log('PERM', ids.permTenantManage, 'tenant.manage');
  await sql.unsafe(`INSERT INTO permissions (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`, [ids.permFactoryManage, 'factory.manage', 'Manage factory settings']);
  log('PERM', ids.permFactoryManage, 'factory.manage');
  await sql.unsafe(`INSERT INTO permissions (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`, [ids.permProductionExecute, 'production.execute', 'Execute production operations']);
  log('PERM', ids.permProductionExecute, 'production.execute');

  // role_permissions
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleTenantAdmin, ids.permTenantManage]);
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleTenantAdmin, ids.permFactoryManage]);
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleTenantAdmin, ids.permProductionExecute]);
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleFactoryAdmin, ids.permFactoryManage]);
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleFactoryAdmin, ids.permProductionExecute]);
  await sql.unsafe(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`, [ids.roleOperator, ids.permProductionExecute]);
  console.log('  ROLE-PERMISSIONS: 6 mappings created');

  // Tenant (no RLS - tenants table excluded from RLS)
  console.log('\n--- Phase 2: Tenant ---');
  await sql.unsafe(`INSERT INTO tenants (id, name, subscription_plan, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())`, 
    [ids.tenant, 'Demo Glass Factory', 'enterprise', true]);
  log('TENANT', ids.tenant, 'Demo Glass Factory');

  // Phase 3: Set tenant context for RLS and insert tenant-scoped data
  console.log('\n--- Phase 3: Tenant-scoped data ---');
  await sql.unsafe(`SELECT set_config('app.current_tenant_id', $1, false)`, [ids.tenant]);
  console.log('  SET app.current_tenant_id = ' + ids.tenant);

  // Factory
  await sql.unsafe(`INSERT INTO factories (id, tenant_id, name, is_active, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
    [ids.factory, ids.tenant, 'Main Factory', true]);
  log('FACTORY', ids.factory, 'Main Factory');

  // Admin user
  const passwordHash = await bcrypt.hash('Test1234!', 10);
  await sql.unsafe(`INSERT INTO users (id, tenant_id, factory_id, selected_factory_id, role_id, name, email, password_hash, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [ids.adminUser, ids.tenant, ids.factory, ids.factory, ids.roleTenantAdmin, 'Admin User', 'admin@glassos.com', passwordHash, true]);
  log('USER', ids.adminUser, 'admin@glassos.com / Test1234!');

  // Stations
  await sql.unsafe(`INSERT INTO stations (id, tenant_id, factory_id, station_code, name, station_type, sort_order, max_concurrent_jobs, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [ids.stationCutting, ids.tenant, ids.factory, 'CUT-01', 'Cutting Station', 'cutting', 1, 2, true]);
  log('STATION', ids.stationCutting, 'Cutting Station');

  await sql.unsafe(`INSERT INTO stations (id, tenant_id, factory_id, station_code, name, station_type, sort_order, max_concurrent_jobs, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [ids.stationGrinding, ids.tenant, ids.factory, 'GRN-01', 'Grinding Station', 'grinding', 2, 2, true]);
  log('STATION', ids.stationGrinding, 'Grinding Station');

  // Machines
  await sql.unsafe(`INSERT INTO machines (id, tenant_id, factory_id, station_id, machine_code, name, machine_type, status, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [ids.machineCutter, ids.tenant, ids.factory, ids.stationCutting, 'CUT-MC-01', 'Primary Cutter', 'cutting', 'active', true]);
  log('MACHINE', ids.machineCutter, 'Primary Cutter');

  await sql.unsafe(`INSERT INTO machines (id, tenant_id, factory_id, station_id, machine_code, name, machine_type, status, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [ids.machineGrinder, ids.tenant, ids.factory, ids.stationGrinding, 'GRN-MC-01', 'Primary Grinder', 'grinding', 'active', true]);
  log('MACHINE', ids.machineGrinder, 'Primary Grinder');

  // Station-Machine assignments (no tenant_id — uses EXISTS-based RLS)
  await sql.unsafe(`INSERT INTO station_machine_assignments (id, station_id, machine_id, is_primary) VALUES ($1, $2, $3, $4)`,
    [makeUlid(60), ids.stationCutting, ids.machineCutter, true]);
  await sql.unsafe(`INSERT INTO station_machine_assignments (id, station_id, machine_id, is_primary) VALUES ($1, $2, $3, $4)`,
    [makeUlid(61), ids.stationGrinding, ids.machineGrinder, true]);
  console.log('  STATION-MACHINE-ASSIGNMENTS: 2 created');

  // Production operations
  await sql.unsafe(`INSERT INTO production_operations (id, tenant_id, operation_code, operation_name, sort_order, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [makeUlid(70), ids.tenant, 'CUT', 'Cutting', 1, true]);
  await sql.unsafe(`INSERT INTO production_operations (id, tenant_id, operation_code, operation_name, sort_order, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [makeUlid(71), ids.tenant, 'GRN', 'Grinding', 2, true]);
  await sql.unsafe(`INSERT INTO production_operations (id, tenant_id, operation_code, operation_name, sort_order, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [makeUlid(72), ids.tenant, 'INSP', 'Inspection', 3, true]);
  console.log('  PRODUCTION-OPERATIONS: 3 created (CUT, GRN, INSP)');

  // Production queues (one per station)
  await sql.unsafe(`INSERT INTO production_queues (id, tenant_id, factory_id, station_id, operation_code, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [makeUlid(80), ids.tenant, ids.factory, ids.stationCutting, 'CUT', true]);
  await sql.unsafe(`INSERT INTO production_queues (id, tenant_id, factory_id, station_id, operation_code, is_active, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [makeUlid(81), ids.tenant, ids.factory, ids.stationGrinding, 'GRN', true]);
  console.log('  PRODUCTION-QUEUES: 2 created');

  console.log('\n=== Seed completed successfully ===');
  console.log('Login credentials: admin@glassos.com / Test1234!');
  console.log('Tenant ID: ' + ids.tenant);
}

try {
  await main();
} catch (err) {
  console.error('\nSEED FAILED:', err.message);
  process.exit(1);
}
await sql.end();
