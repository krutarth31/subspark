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
  const rawPurchases = await db
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
      refundRequest?: {
        status: string
        reason?: string
        sellerReason?: string
      }
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
          price: '$product.price',
          currency: '$product.currency',
          productName: '$product.name',
          invoiceId: 1,
          subscriptionId: 1,
          paymentIntentId: 1,
          customerId: 1,
          sellerId: 1,
          refundRequest: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ])
    .toArray()
  const purchases = rawPurchases.map((p) => ({
    ...p,
    _id: p._id.toString(),
    productId: p.productId.toString(),
    userId: p.userId.toString(),
    createdAt: p.createdAt.toISOString(),
  }))
  return NextResponse.json({ purchases })
}
