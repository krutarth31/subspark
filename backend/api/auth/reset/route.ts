import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { hashPassword } from '@/lib/auth'

const schema = z.object({
  token: z.string(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  const { token, password } = parsed.data
  const db = await getDb()
  const record = await db
    .collection<{ token: string; userId: ObjectId; expiry: number }>('passwordResets')
    .findOne({ token })
  if (!record || record.expiry < Date.now()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }
  const hashed = hashPassword(password)
  await db.collection('users').updateOne({ _id: record.userId }, { $set: { password: hashed } })
  await db.collection('passwordResets').deleteOne({ token })
  return NextResponse.json({ ok: true })
}
