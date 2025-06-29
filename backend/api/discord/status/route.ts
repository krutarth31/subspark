import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function GET() {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ connected: false })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ connected: false })
    const record = await db
      .collection<{
        userId: ObjectId
        guildId: string
        guildName: string
      }>('discordIntegrations')
      .findOne({ userId: session.userId })
    if (!record) return NextResponse.json({ connected: false })
    return NextResponse.json({
      connected: true,
      guildId: record.guildId,
      guildName: record.guildName,
    })
  } catch (err) {
    console.error('Discord status failed', err)
    return NextResponse.json({ connected: false })
  }
}
