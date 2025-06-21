import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { generateToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  const { email } = parsed.data
  const db = await getDb()
  const user = await db.collection<{ _id: ObjectId }>('users').findOne({ email })
  if (user) {
    const token = generateToken()
    const expiry = Date.now() + 60 * 60 * 1000 // 1 hour
    await db
      .collection<{ token: string; userId: ObjectId; expiry: number }>('passwordResets')
      .insertOne({ token, userId: user._id, expiry })
    const { origin } = new URL(request.url)
    try {
      await sendPasswordResetEmail(email, token, origin)
    } catch (err) {
      console.error('Failed to send reset email:', err)
    }
  }
  return NextResponse.json({ ok: true })
}
