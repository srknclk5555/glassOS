CREATE TABLE "permissions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"plan" varchar(50) DEFAULT 'trial' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"country" varchar(100),
	"phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"user_id" char(26) NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26),
	"factory_id" char(26),
	"selected_factory_id" char(26),
	"role_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" char(26) NOT NULL,
	"permission_id" char(26) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"relationship" varchar(100) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnel" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"personnel_code" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"title_id" char(26),
	"role" varchar(50) DEFAULT 'operator' NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"hired_at" date,
	"notes" text,
	"user_id" char(26),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "personnel_certificates" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"certificate_type" varchar(100) NOT NULL,
	"issued_at" date NOT NULL,
	"expires_at" date,
	"document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnel_health_information" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"blood_type" varchar(10),
	"has_disability" boolean DEFAULT false NOT NULL,
	"disability_notes" text,
	"medical_conditions" text,
	"allergies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "personnel_health_information_personnel_id_unique" UNIQUE("personnel_id")
);
--> statement-breakpoint
CREATE TABLE "personnel_machine_assignments" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"machine_id" char(26) NOT NULL,
	"assignment_type" varchar(50) DEFAULT 'primary' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personnel_shifts" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"shift_name" varchar(100) NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"days_of_week" integer[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnel_station_permissions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"station_id" char(26) NOT NULL,
	"permission_level" varchar(50) DEFAULT 'operate' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnel_titles" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"title_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26)
);
--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_factory_id_factories_id_fk" FOREIGN KEY ("selected_factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_title_id_personnel_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."personnel_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_certificates" ADD CONSTRAINT "personnel_certificates_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_health_information" ADD CONSTRAINT "personnel_health_information_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_machine_assignments" ADD CONSTRAINT "personnel_machine_assignments_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_shifts" ADD CONSTRAINT "personnel_shifts_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_station_permissions" ADD CONSTRAINT "personnel_station_permissions_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_titles" ADD CONSTRAINT "personnel_titles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;