import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  let accountId = new URL(request.url).searchParams.get('accountId')
  let seller
  try {
    const db = await getDb()
    if (!accountId) {
      try {
        const cookieStore = cookies()
        const token = cookieStore.get('session')?.value
        if (token) {
          const session = await db
            .collection<{ token: string; userId: ObjectId }>('sessions')
            .findOne({ token })
          if (session) {
            seller = await db
              .collection<{ _id: string; active: boolean; userId?: ObjectId }>('sellers')
              .findOne({ userId: session.userId })
            accountId = seller?._id || null
          }
        }
      } catch {
        // ignore
      }
    }
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }
    if (!seller) {
      seller = await db
        .collection<{ _id: string; active: boolean; userId?: ObjectId }>('sellers')
        .findOne({ _id: accountId })
    }
    return NextResponse.json({ active: !!seller?.active, accountId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
