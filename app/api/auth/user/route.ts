import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ user: null })
  const db = await getDb().catch(() => null)
  if (!db) return NextResponse.json({ user: null })
  const session = await db.collection<{ token: string; userId: ObjectId }>('sessions').findOne({ token })
  if (!session) return NextResponse.json({ user: null })
  const user = await db
    .collection<{ _id: ObjectId; name: string; email: string; avatar?: string }>('users')
    .findOne({ _id: session.userId }, { projection: { password: 0 } })
  if (!user) return NextResponse.json({ user: null })
  const seller = await db
    .collection<{ _id: string; active: boolean; userId?: ObjectId }>('sellers')
    .findOne({ userId: session.userId })
  const role = seller?.active ? 'seller' : 'buyer'
  return NextResponse.json({
    user: {
      ...user,
      role,
      sellerAccountId: seller?._id || null,
      sellerActive: !!seller?.active,
    },
  })
}
