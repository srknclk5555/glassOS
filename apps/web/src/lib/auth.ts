import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, sql } from "@repo/db";
import { loginSchema } from "@repo/types";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Use SECURITY DEFINER function — glassos_app has EXECUTE only on this function
        // Bypasses RLS without needing owner credentials.
        const result = await db.execute(sql`
          SELECT * FROM auth_lookup_user(${email})
        `);
        const userRow = result[0] as Record<string, any> | undefined;
        if (!userRow) return null;

        // Map PostgreSQL snake_case → camelCase
        const user = {
          id: userRow.id as string,
          name: userRow.name as string,
          email: userRow.email as string,
          tenantId: userRow.tenant_id as string,
          factoryId: userRow.factory_id as string | null,
          selectedFactoryId: userRow.selected_factory_id as string | null,
          roleId: userRow.role_id as string,
          role: userRow.role_name as string,
          passwordHash: userRow.password_hash as string,
          isActive: userRow.is_active as boolean,
          deletedAt: userRow.deleted_at as string | null,
        };

        if (!user || !user.isActive || user.deletedAt) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        // Normalize role name: "Tenant Admin" → "tenant_admin"
        // DB stores display names, but ROLE_NAV_MAP uses machine names
        const normalizedRole = user.role.toLowerCase().replace(/\s+/g, '_');

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          factoryId: user.factoryId ?? undefined,
          selectedFactoryId: user.selectedFactoryId ?? undefined,
          roleId: user.roleId,
          role: normalizedRole,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as typeof user & {
          id: string;
          role: string;
          tenantId: string;
          factoryId?: string;
          selectedFactoryId?: string;
          tenantName?: string;
          factoryName?: string;
          selectedFactoryName?: string;
        };

        token.userId = customUser.id;
        token.role = customUser.role;
        token.tenantId = customUser.tenantId;
        token.factoryId = customUser.factoryId;
        token.selectedFactoryId = customUser.selectedFactoryId;
        token.tenantName = customUser.tenantName;
        token.factoryName = customUser.factoryName;
        token.selectedFactoryName = customUser.selectedFactoryName;
      }

      return token;
    },
    async session({ session, token }) {
      const sessionUser = session.user as typeof session.user & {
        id?: string;
        role?: string;
        tenantId?: string;
        factoryId?: string;
        selectedFactoryId?: string;
        tenantName?: string;
        factoryName?: string;
        selectedFactoryName?: string;
      };

      if (sessionUser) {
        sessionUser.id = token.userId as string;
        sessionUser.role = token.role as string;
        sessionUser.tenantId = token.tenantId as string;
        sessionUser.factoryId = token.factoryId as string | undefined;
        sessionUser.selectedFactoryId = token.selectedFactoryId as string | undefined;
        sessionUser.tenantName = token.tenantName as string;
        sessionUser.factoryName = token.factoryName as string | undefined;
        sessionUser.selectedFactoryName = token.selectedFactoryName as string | undefined;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
