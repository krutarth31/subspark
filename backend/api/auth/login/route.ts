import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { verifyPassword, generateToken } from '@/lib/auth'
import { z } from 'zod'
import { ObjectId } from 'mongodb'

const schema = z.object({
  email: z.string().email(),
  password: z.string()
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  const { email, password } = parsed.data
  const db = await getDb()
  const user = await db.collection<{ _id: ObjectId; password: string }>('users').findOne({ email })
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const token = generateToken()
  await db.collection('sessions').insertOne({ token, userId: user._id })
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax`)
  return res
}
