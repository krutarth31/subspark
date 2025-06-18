import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }
    const db = await getDb()
    await db
      .collection<{ _id: string; active: boolean }>('sellers')
      .updateOne({ _id: accountId }, { $set: { active: true } }, { upsert: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to activate' }, { status: 500 })
  }
}
