import { NextResponse } from 'next/server';
import { db, users } from '@repo/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pw = url.searchParams.get('pw') ?? '';
    const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.email, 'tenant-admin@example.com')).limit(1);
    const userRow = rows[0];
    if (!userRow) return NextResponse.json({ ok: false, error: 'user-not-found' });
    const hash = userRow.passwordHash as string;
    const match = await bcrypt.compare(pw, hash);
    return NextResponse.json({ ok: true, result: match });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
