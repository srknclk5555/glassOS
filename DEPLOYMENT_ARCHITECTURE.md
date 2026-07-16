# DEPLOYMENT_ARCHITECTURE - GlassOS Deployment Architecture

Date: 2026-07-15

Architecture Status
✅ Completed

Implementation Status
⏳ Planned (Sprint 2.3)

Validation Status
⏳ Not Executed

This document defines the production deployment, PostgreSQL role, migration, secret, backup, restore, update, and multi-tenant security model for GlassOS.

No SQL was applied while preparing this document. No roles were created. No schema was changed.

Related documents:

- `DATABASE_ARCHITECTURE.md` - database access and service/repository architecture
- `PRODUCT_ARCHITECTURE.md` - product and recipe architecture
- `PRODUCTION_ARCHITECTURE.md` - production and MES domain architecture
- `SECURITY.md` - security policy, threat model, and security checklist

---

## Deployment Models

### SaaS

GlassOS operates as a centrally hosted multi-tenant application.

Recommended use:

- Standard GlassOS cloud product
- Multiple customers in one controlled production environment
- Centralized operations, monitoring, backup, and upgrade cadence

Database model:

- Shared PostgreSQL cluster/project
- Shared schema
- Tenant isolation enforced by PostgreSQL RLS
- Application connects only as `glassos_app`
- Migrations run only as `glassos_owner`

Security requirements:

- Every tenant-owned table has `tenant_id`
- RLS is enabled and forced on tenant-owned tables
- Runtime role has `NOBYPASSRLS`
- Runtime role is not table owner

### Hybrid

GlassOS application is centrally operated, while database or integration surfaces may be deployed per customer or per region.

Recommended use:

- Customers with stronger data residency requirements
- Factories with local integration dependencies
- Large enterprise customers needing isolated operational boundaries

Database model options:

- Per-customer database with same role architecture
- Per-region database with tenant isolation inside each region
- Central app with customer-specific connection routing

Security requirements:

- Same `glassos_owner` / `glassos_app` split
- Customer-specific secrets
- Backup/restore run per customer database
- Tenant context still required even if database is customer-isolated

### On-Premise

GlassOS runs in the customer's infrastructure.

Recommended use:

- Customers requiring full data control
- Air-gapped or restricted manufacturing environments
- Contractual requirement for local operation

Database model:

- Customer-managed PostgreSQL
- GlassOS-provided migration and installation package
- Local backup and restore procedure owned by customer operations

Security requirements:

- Customer DBA must create the GlassOS roles exactly as specified
- App connection must use `glassos_app`
- Migration connection must use `glassos_owner`
- Installation checklist must verify `rolbypassrls = false`

---

## PostgreSQL Role Architecture

**Status:** Implemented (Sprint 2.2)

GlassOS uses two separate PostgreSQL login roles in production.

### `glassos_owner`

Purpose:

- Migrations
- Schema changes
- Table creation
- Index creation
- Foreign keys
- RLS policy creation and updates

Required attributes:

```sql
CREATE ROLE glassos_owner
  LOGIN
  NOSUPERUSER
  NOBYPASSRLS
  NOCREATEDB
  NOCREATEROLE
  PASSWORD '<strong-owner-password>';
```

Rules:

- Only CI/CD migration jobs may use this role.
- The application must never use this role at runtime.
- This role owns GlassOS schemas, tables, indexes, policies, and functions.
- This role is operationally privileged but must still not bypass RLS.

### `glassos_app`

Purpose:

- Runtime application access

Required attributes:

```sql
CREATE ROLE glassos_app
  LOGIN
  NOSUPERUSER
  NOBYPASSRLS
  NOCREATEDB
  NOCREATEROLE
  PASSWORD '<strong-app-password>';
```

Allowed privileges only:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- `USAGE`
- `EXECUTE`

Rules:

- Production `DATABASE_URL` must use `glassos_app`.
- `glassos_app` must not own tables.
- `glassos_app` must not have `BYPASSRLS`.
- `glassos_app` must not be member of a role that has `BYPASSRLS`.
- `glassos_app` must not have `CREATE`, `ALTER`, `DROP`, `CREATEDB`, or `CREATEROLE`.

### Current Ownership Analysis Plan

> **Historical Context:** Bu bölüm Sprint 2.2 öncesi rol ve yetki planlamalarını içerir. Roller uygulamaya alındığı için bu analiz referans amaçlı tutulmaktadır.

Live owner inspection was not executed in this task because the instruction explicitly says not to apply SQL or change roles. The read-only owner audit query to run in the database is:

```sql
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants',
    'factories',
    'customers',
    'customer_contacts',
    'delivery_points',
    'roles',
    'permissions',
    'role_permissions',
    'users',
    'settings',
    'audit_logs',
    'material_categories',
    'materials',
    'material_unit_profiles',
    'material_packagings',
    'product_categories',
    'products',
    'recipes',
    'recipe_materials',
    'recipe_operations',
    'routing_templates',
    'routing_steps'
  )
ORDER BY tablename;
```

Expected risk based on Sprint 2.2B acceptance findings:

- Runtime connection used `neondb_owner`.
- `neondb_owner` had `rolbypassrls = true`.
- It is likely that many or all current GlassOS tables are owned by `neondb_owner`.

Tables that must be checked for `neondb_owner` ownership:

| Table                    | Desired owner   | Current owner status               |
| ------------------------ | --------------- | ---------------------------------- |
| `audit_logs`             | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `customers`              | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `customer_contacts`      | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `delivery_points`        | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `factories`              | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `material_categories`    | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `material_packagings`    | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `material_unit_profiles` | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `materials`              | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `permissions`            | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `product_categories`     | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `products`               | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `recipe_materials`       | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `recipe_operations`      | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `recipes`                | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `role_permissions`       | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `roles`                  | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `routing_steps`          | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `routing_templates`      | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `settings`               | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `tenants`                | `glassos_owner` | ACTION REQUIRED: verify live owner |
| `users`                  | `glassos_owner` | ACTION REQUIRED: verify live owner |

Owner remediation plan, not to be executed yet:

```sql
ALTER TABLE public.<table_name> OWNER TO glassos_owner;
```

---

## Migration Strategy

Migration is a privileged operational activity.

Rules:

- Migrations run only with `glassos_owner`.
- The runtime app never runs migrations.
- Migration secrets are available only to CI/CD deployment jobs.
- Migration jobs must run before app rollout.
- Failed migrations stop deployment.
- Rollback strategy must be defined per release.

Recommended migration pipeline:

1. Build application.
2. Type-check application.
3. Run migration dry-run or review step where available.
4. Apply migrations using `glassos_owner`.
5. Run post-migration checks:
   - required tables exist
   - RLS enabled
   - RLS forced where required
   - `glassos_app` has only runtime privileges
   - `glassos_app.rolbypassrls = false`
6. Deploy application with `glassos_app` connection string.
7. Run acceptance tests with `glassos_app`.

---

## Secret Management

Required production secrets:

- `DATABASE_URL` - uses `glassos_app`
- `MIGRATION_DATABASE_URL` - uses `glassos_owner`
- `NEXTAUTH_SECRET`
- external integration secrets

Rules:

- Secrets are never committed.
- Runtime app receives only runtime secrets.
- CI/CD receives migration secret only in migration job scope.
- Developers do not use production secrets locally.
- Secret rotation must be documented and tested.

Recommended storage:

- SaaS: platform secret manager such as Vercel, Neon integration secrets, or cloud secret manager
- Hybrid: cloud secret manager per customer/region
- On-premise: customer-managed secret vault

---

## Connection Strategy

Runtime:

- App connects as `glassos_app`.
- Every tenant-scoped operation sets `app.current_tenant_id` inside a transaction.
- Runtime connection must not have `BYPASSRLS`.

Migration:

- CI/CD migration job connects as `glassos_owner`.
- Connection is short-lived.
- Secret is unavailable to the running app.

Admin:

- Admin operations must not be implemented by adding super-admin bypass logic to RLS policies.
- Admin access must use one of the controlled models described in the RLS Architecture section.

Connection validation query:

```sql
SELECT
  current_user,
  rolsuper,
  rolbypassrls,
  rolcreatedb,
  rolcreaterole
FROM pg_roles
WHERE rolname = current_user;
```

Expected runtime result:

- `current_user = 'glassos_app'`
- `rolsuper = false`
- `rolbypassrls = false`
- `rolcreatedb = false`
- `rolcreaterole = false`

---

## Backup Strategy

SaaS:

- Automated provider backups enabled.
- Point-in-time recovery enabled where available.
- Periodic logical exports for compliance if required.

Hybrid:

- Backup policy defined per customer or region.
- Central monitoring verifies backup freshness.

On-premise:

- Customer owns backup execution.
- GlassOS supplies required backup checklist.

Backup checklist:

- Database backup schedule defined
- Retention period defined
- Encryption enabled
- Backup access restricted
- Restore test performed regularly
- Tenant-impact analysis documented

---

## Restore Strategy

Restore is a production incident workflow.

Required restore levels:

- Full database restore
- Point-in-time restore
- Branch/clone restore for investigation
- Tenant-level logical recovery where feasible

Rules:

- Restore must not run directly over production without approval.
- Restore target is first validated in an isolated environment.
- RLS, ownership, and runtime role checks are repeated after restore.
- Application acceptance tests run after restore.

Post-restore validation:

```sql
SELECT current_user;
-- Then verify:
-- 1. table owners
-- 2. RLS enabled
-- 3. FORCE RLS where required
-- 4. glassos_app has NOBYPASSRLS
-- 5. cross-tenant read is blocked
```

---

## Update Strategy

Release order:

1. Backup or restore point confirmed.
2. Migration package reviewed.
3. Migrations applied with `glassos_owner`.
4. App deployed with `glassos_app`.
5. Acceptance tests run.
6. Monitoring checks pass.

Release gates:

- Build PASS
- Type check PASS
- Migration PASS
- Login PASS
- Core CRUD PASS
- Audit log PASS
- Tenant isolation PASS
- SQL-level RLS PASS

If RLS fails, release is blocked.

---

## Multi-Tenant Security

GlassOS is multi-tenant by design.

Security rules:

- Tenant isolation is enforced at the database layer.
- Application-level tenant filters are not enough.
- Every tenant-owned table must have RLS.
- Every tenant-owned table must use `tenant_id` directly or through a verified parent relation.
- Runtime role must be unable to bypass RLS.

Tenant context:

- `app.current_tenant_id` is the only RLS decision input.
- It is set inside a transaction.
- It must be reset automatically at transaction end by using transaction-local settings.

Recommended context pattern:

```sql
SELECT set_config('app.current_tenant_id', '<tenant_uuid>', true);
```

The third argument must remain `true` so the setting is local to the current transaction.

---

## RLS Architecture

### Current RLS Findings

The current RLS migration contains policies that depend on:

```sql
current_setting('app.current_user_role', true) = 'super_admin'
```

This appears in the active RLS migration for:

- `tenants`
- `factories`
- `users`
- `settings`
- `customers`
- `customer_contacts`
- `delivery_points`
- `audit_logs`
- `material_categories`
- `materials`
- `material_unit_profiles`
- `material_packagings`
- `product_categories`
- `products`
- `recipes`
- `recipe_materials`
- `recipe_operations`
- `routing_templates`
- `routing_steps`
- write policies for `roles`, `permissions`, and `role_permissions`

Application code also currently sets `app.current_user_role` in the tenant session wrapper.

### Target RLS Model

RLS policies must decide only from:

```sql
current_setting('app.current_tenant_id', true)
```

Target tenant-owned table pattern:

```sql
USING (
  tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
)
WITH CHECK (
  tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
)
```

Target child-table pattern:

```sql
USING (
  EXISTS (
    SELECT 1
    FROM parent_table
    WHERE parent_table.id = child_table.parent_id
      AND parent_table.tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
)
```

Important:

- Super Admin access must not be embedded in RLS policies.
- RLS remains tenant isolation only.
- Administrative access is handled outside tenant RLS policies with a separate controlled architecture.

### Admin Access Options

#### Option A - SECURITY DEFINER functions

Admin operations are exposed through narrowly scoped PostgreSQL functions owned by `glassos_owner`.

Pros:

- Strong auditability at the database boundary
- Very narrow privilege surface
- App role can execute only approved admin functions
- Avoids broad admin database connections

Cons:

- Requires careful function design
- SQL review becomes more important
- Mistakes in `SECURITY DEFINER` search path or dynamic SQL can be dangerous

Recommended safeguards:

- Set fixed `search_path` inside every function
- Avoid dynamic SQL unless absolutely required
- Grant `EXECUTE` only on specific functions
- Log every admin action to `audit_logs`

#### Option B - Separate Admin API

Admin operations are implemented in a separate service/API with stricter authentication and operational controls.

Pros:

- Clear operational separation
- Easier to monitor and rate-limit
- Can require stronger authentication
- Keeps customer runtime path simpler

Cons:

- More infrastructure
- More deployment complexity
- Must still use a safe database role strategy

Recommended use:

- SaaS central operations
- Tenant provisioning
- Support tooling
- Controlled back-office workflows

#### Option C - Separate Admin Connection

Admin-only backend path uses a separate connection string with a more privileged role.

Pros:

- Simple operational model
- Compatible with existing app/service patterns
- Useful for migration-like maintenance jobs

Cons:

- Highest blast radius if leaked
- Easy to accidentally use in runtime code
- Requires strict secret isolation

Recommended use:

- CI/CD jobs
- One-off maintenance tasks
- Not recommended for normal web request handling

Recommended GlassOS decision:

- Use `glassos_app` for normal runtime.
- Use `glassos_owner` only for migrations.
- For product admin features, prefer `SECURITY DEFINER` functions or a separate Admin API.
- Do not use RLS policy role bypass for Super Admin.

---

## Neon Compatibility

Neon supports PostgreSQL roles.

Important Neon behavior:

- The default database owner role is usually named like `<database>_owner`, for example `neondb_owner`.
- Roles created through Neon Console, Neon CLI, or Neon API are granted membership in `neon_superuser`.
- `neon_superuser` can include `BYPASSRLS`.
- Neon is managed PostgreSQL; direct PostgreSQL `superuser` access is not available.
- Limited-access roles should be created with SQL from a SQL client.

Implication for GlassOS:

- Do not create `glassos_app` from Neon Console, CLI, or API.
- Create `glassos_app` with SQL so it does not inherit `neon_superuser`.
- Create `glassos_owner` with SQL if possible and verify it does not inherit `neon_superuser`.
- If Neon restrictions prevent a SQL-created role from performing required ownership/migration duties, use the Neon owner role only as an administrative bootstrap role, then transfer object ownership and runtime access to limited SQL-created roles.

Production recommendation:

1. Use Neon owner role only for bootstrap.
2. Create `glassos_owner` and `glassos_app` via SQL.
3. Verify:

```sql
SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
FROM pg_roles
WHERE rolname IN ('glassos_owner', 'glassos_app');
```

4. Grant object privileges to `glassos_app`.
5. Transfer GlassOS object ownership to `glassos_owner`.
6. Use `glassos_app` in production `DATABASE_URL`.
7. Use `glassos_owner` only in migration secret.

If Neon does not permit the exact `glassos_owner` model:

- Keep Neon owner as bootstrap/admin only.
- Keep application on SQL-created `glassos_app`.
- Run migrations through a controlled CI job using the Neon owner role only if unavoidable.
- Never use Neon owner in runtime `DATABASE_URL`.
- Acceptance RLS tests must connect as `glassos_app`.

References:

- Neon roles: https://neon.com/docs/manage/roles
- Neon database access: https://neon.com/docs/manage/database-access

---

## Default Privileges Plan

Default privileges must be configured for objects created by `glassos_owner`.

Plan only, not applied:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE glassos_owner IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO glassos_app;

ALTER DEFAULT PRIVILEGES FOR ROLE glassos_owner IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO glassos_app;

ALTER DEFAULT PRIVILEGES FOR ROLE glassos_owner IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO glassos_app;
```

Existing objects also need explicit grants:

```sql
GRANT USAGE ON SCHEMA public TO glassos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO glassos_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO glassos_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO glassos_app;
```

Privileges to avoid for `glassos_app`:

```sql
REVOKE CREATE ON SCHEMA public FROM glassos_app;
REVOKE ALL ON DATABASE <database_name> FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

---

## Production Checklist

Role checks:

- [ ] `glassos_owner` exists
- [ ] `glassos_owner.LOGIN = true`
- [ ] `glassos_owner.NOSUPERUSER = true`
- [ ] `glassos_owner.NOBYPASSRLS = true`
- [ ] `glassos_owner.NOCREATEDB = true`
- [ ] `glassos_owner.NOCREATEROLE = true`
- [ ] `glassos_app` exists
- [ ] `glassos_app.LOGIN = true`
- [ ] `glassos_app.NOSUPERUSER = true`
- [ ] `glassos_app.NOBYPASSRLS = true`
- [ ] `glassos_app.NOCREATEDB = true`
- [ ] `glassos_app.NOCREATEROLE = true`

Ownership checks:

- [ ] All GlassOS tables are owned by `glassos_owner`
- [ ] No GlassOS table is owned by `glassos_app`
- [ ] No GlassOS table remains owned by a `BYPASSRLS` runtime role

Privilege checks:

- [ ] `glassos_app` has required CRUD grants
- [ ] `glassos_app` has required sequence grants
- [ ] `glassos_app` has required function grants
- [ ] `glassos_app` has no schema `CREATE`
- [ ] `PUBLIC` access is revoked where appropriate

RLS checks:

- [ ] RLS enabled on tenant-owned tables
- [ ] RLS forced on tenant-owned tables
- [ ] Policies use only `app.current_tenant_id`
- [ ] Policies do not use `app.current_user_role`
- [ ] Tenant A cannot read Tenant B data
- [ ] Tenant B cannot read Tenant A data

Deployment checks:

- [ ] Migration runs with `glassos_owner`
- [ ] Runtime app runs with `glassos_app`
- [ ] Build passes
- [ ] Type check passes
- [ ] Acceptance test passes
- [ ] Backup verified before release

---

## Customer Installation Flow

### SaaS

1. Create tenant in GlassOS.
2. Configure factory settings.
3. Create tenant admin user.
4. Seed starter master data if required.
5. Run tenant acceptance:
   - login
   - materials CRUD
   - products CRUD
   - audit log
   - tenant isolation
6. Enable production access.

### Hybrid

1. Create customer-specific database or branch.
2. Create `glassos_owner` and `glassos_app`.
3. Apply migrations with `glassos_owner`.
4. Configure customer-specific secrets.
5. Deploy or route application to customer database.
6. Run acceptance with `glassos_app`.
7. Document backup and restore ownership.

### On-Premise

1. Customer DBA provisions PostgreSQL.
2. DBA creates `glassos_owner` and `glassos_app`.
3. DBA verifies both roles are `NOBYPASSRLS`.
4. GlassOS migration package runs with `glassos_owner`.
5. Runtime service is configured with `glassos_app`.
6. Installation acceptance test runs.
7. Customer signs off backup, restore, monitoring, and update plan.

---

## Action Plan

1. Run read-only owner audit query and capture table owners.
2. Create SQL migration plan for role creation, ownership transfer, grants, revokes, and default privileges.
3. Revise RLS policies to remove `app.current_user_role`.
4. Decide admin architecture:
   - preferred: `SECURITY DEFINER` functions for narrow database-level admin operations
   - alternative: separate Admin API for operational workflows
5. Update acceptance tests so RLS checks always connect as `glassos_app`.
6. Block production release until tenant isolation and SQL-level RLS pass.
