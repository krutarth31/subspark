import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
  }
  try {
    const db = await getDb()
    const seller = await db
      .collection<{ _id: string; active: boolean }>('sellers')
      .findOne({ _id: accountId })
    return NextResponse.json({ active: !!seller?.active })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
