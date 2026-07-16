-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "factories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;

-- Tenants Policy: Isolation by tenant_id session variable, bypass for super_admin
CREATE POLICY tenant_isolation ON "tenants"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Factories Policy: Isolation by tenant_id
CREATE POLICY factory_isolation ON "factories"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Users Policy: Isolation by tenant_id
CREATE POLICY user_isolation ON "users"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Settings Policy: Isolation by checking linked factory's tenant_id
CREATE POLICY settings_isolation ON "settings"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "factories"
    WHERE "factories"."id" = "settings"."factory_id"
      AND "factories"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

-- Customers Policy: Isolation by tenant_id
CREATE POLICY customers_isolation ON "customers"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Customer Contacts Policy: Isolation by linked customer's tenant_id
CREATE POLICY customer_contacts_isolation ON "customer_contacts"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "customers"
    WHERE "customers"."id" = "customer_contacts"."customer_id"
      AND "customers"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

-- Delivery Points Policy: Isolation by linked customer's tenant_id
CREATE POLICY delivery_points_isolation ON "delivery_points"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "customers"
    WHERE "customers"."id" = "delivery_points"."customer_id"
      AND "customers"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

-- Roles, Permissions, Role_Permissions Policies: Public read, Super Admin write
CREATE POLICY roles_read_all ON "roles" FOR SELECT USING (true);
CREATE POLICY roles_write_super_admin ON "roles" FOR ALL USING (current_setting('app.current_user_role', true) = 'super_admin');

CREATE POLICY permissions_read_all ON "permissions" FOR SELECT USING (true);
CREATE POLICY permissions_write_super_admin ON "permissions" FOR ALL USING (current_setting('app.current_user_role', true) = 'super_admin');

CREATE POLICY role_permissions_read_all ON "role_permissions" FOR SELECT USING (true);
CREATE POLICY role_permissions_write_super_admin ON "role_permissions" FOR ALL USING (current_setting('app.current_user_role', true) = 'super_admin');