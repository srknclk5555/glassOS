import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import fs from 'fs';
import path from 'path';

const _authLogPath = (() => {
  try {
    const d = path.join(process.cwd(), '.tmp');
    fs.mkdirSync(d, { recursive: true });
    return path.join(d, 'auth-debug.log');
  } catch (e) {
    return path.join('.tmp', 'auth-debug.log');
  }
})();

try { fs.appendFileSync(_authLogPath, new Date().toISOString() + ' auth module loaded\n'); } catch (e) {}
import { db } from "@repo/db";
import { auditLogs, roles } from "@repo/db";
import { eq, sql } from "drizzle-orm";
import { users } from "@repo/db";
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
        const userRows = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT set_config('app.current_user_role', 'super_admin', true);`);
          return tx
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              tenantId: users.tenantId,
              factoryId: users.factoryId,
              selectedFactoryId: users.selectedFactoryId,
              roleId: users.roleId,
              role: roles.name,
              passwordHash: users.passwordHash,
              active: users.active,
              deletedAt: users.deletedAt,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.email, email))
            .limit(1);
        });

        const user = userRows[0];
        if (!user || !user.active || user.deletedAt) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          factoryId: user.factoryId ?? undefined,
          selectedFactoryId: user.selectedFactoryId ?? undefined,
          roleId: user.roleId,
          role: user.role,
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
