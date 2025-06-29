import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  banner: z.string().optional(),
  bio: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const update: Record<string, unknown> = {}
    for (const key of ['name', 'avatar', 'banner', 'bio'] as const) {
      const value = parsed.data[key]
      if (value !== undefined) update[key] = value
    }
    if (Object.keys(update).length > 0) {
      await db.collection('users').updateOne({ _id: session.userId }, { $set: update })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}
