import { NextResponse } from 'next/server';
import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      tenantId: users.tenantId,
      roleId: users.roleId,
      isActive: users.isActive,
      factoryId: users.factoryId,
    }).from(users).where(eq(users.email, 'tenant-admin@example.com')).limit(1);

    if (rows.length === 0) return NextResponse.json({ ok: true, user: null });
    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
