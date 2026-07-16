import { NextResponse } from 'next/server';
import { db, auditLogs, eq } from '@repo/db';

export async function GET() {
  try {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'auth-debug')).orderBy(auditLogs.createdAt).limit(50);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
