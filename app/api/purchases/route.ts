import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

export async function GET() {
  const db = await getDb()
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ purchases: [] })
  const session = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!session) return NextResponse.json({ purchases: [] })
  const purchases = await db
    .collection<{
      _id: ObjectId
      userId: ObjectId
      productId: ObjectId
      status: string
      createdAt: Date
      invoiceId?: string
      subscriptionId?: string
      paymentIntentId?: string
      customerId?: string
      sellerId: string
    }>('purchases')
    .aggregate([
      { $match: { userId: session.userId } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          status: 1,
          createdAt: 1,
          productId: 1,
          productName: '$product.name',
          invoiceId: 1,
          subscriptionId: 1,
          paymentIntentId: 1,
          customerId: 1,
          sellerId: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ])
    .toArray()
  return NextResponse.json({ purchases })
}
