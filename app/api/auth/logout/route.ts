import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (session) {
    const db = await getDb().catch(() => null)
    if (db) {
      await db.collection('sessions').deleteOne({ token: session })
    }
  }
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax')
  return res
}
