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
    try {
      const cookieStore = cookies()
      const token = cookieStore.get('session')?.value
      if (token) {
        const session = await db
          .collection<{ token: string; userId: ObjectId }>('sessions')
          .findOne({ token })
        if (session) userId = session.userId
      }
    } catch {
      // ignore
    }
    await db
      .collection<{ _id: string; active: boolean; userId?: ObjectId }>('sellers')
      .updateOne(
        { _id: accountId },
        { $set: { active: true, userId } },
        { upsert: true }
      )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to activate' }, { status: 500 })
  }
}
