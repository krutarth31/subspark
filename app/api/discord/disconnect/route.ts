import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function POST() {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ ok: true })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (session) {
      await db
        .collection<{ userId: ObjectId }>('discordIntegrations')
        .deleteOne({ userId: session.userId })
    }
  } catch (err) {
    console.error('Discord disconnect failed', err)
  }
  return NextResponse.json({ ok: true })
}

export const DELETE = POST
