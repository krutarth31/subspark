import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }
    const db = await getDb()
    let userId: ObjectId | null = null
    let userInfo: { name: string; email: string; accountId?: string } | null = null
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('session')?.value
      if (token) {
        const session = await db
          .collection<{ token: string; userId: ObjectId }>('sessions')
          .findOne({ token })
        if (session) {
          userId = session.userId
          const u = await db
            .collection<{ _id: ObjectId; name: string; email: string; accountId?: string }>('users')
            .findOne({ _id: session.userId }, { projection: { name: 1, email: 1, accountId: 1 } })
          if (u) userInfo = { name: u.name, email: u.email, accountId: u.accountId }
        }
      }
    } catch {
      // ignore
    }
    await db
      .collection<{ _id: string; active: boolean; userId?: ObjectId; name?: string; email?: string; accountId?: string }>('sellers')
      .updateOne(
        { _id: accountId },
        { $set: { active: true, userId, ...(userInfo ?? {}) } },
        { upsert: true }
      )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to activate' }, { status: 500 })
  }
}
