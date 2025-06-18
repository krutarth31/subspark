import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { hashPassword, generateToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  const { name, email, password } = parsed.data
  const db = await getDb()
  const existing = await db.collection('users').findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'User exists' }, { status: 400 })
  }
  const hashed = hashPassword(password)
  const result = await db.collection('users').insertOne({ name, email, password: hashed })
  const token = generateToken()
  await db.collection('sessions').insertOne({ token, userId: result.insertedId })
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax`)
  return res
}
