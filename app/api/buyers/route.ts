import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

export async function GET() {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ buyers: [] })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ buyers: [] })
    const seller = await db
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: session.userId })
    if (!seller) return NextResponse.json({ buyers: [] })
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
        sellerId: string
        refundRequest?: {
          status: string
          reason?: string
          sellerReason?: string
        }
      }>('purchases')
      .aggregate([
        { $match: { sellerId: seller._id } },
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
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            status: 1,
            createdAt: 1,
            invoiceId: 1,
            subscriptionId: 1,
            paymentIntentId: 1,
            sellerId: 1,
            productId: 1,
            userId: 1,
            refundRequest: 1,
            productName: '$product.name',
            buyerName: '$user.name',
            buyerEmail: '$user.email',
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray()
    const formatted = purchases.map((p) => ({
      _id: p._id.toString(),
      productId: p.productId.toString(),
      userId: p.userId.toString(),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      invoiceId: p.invoiceId,
      subscriptionId: p.subscriptionId,
      paymentIntentId: p.paymentIntentId,
      sellerId: p.sellerId,
      productName: p.productName,
      buyerName: p.buyerName,
      buyerEmail: p.buyerEmail,
      refundRequest: p.refundRequest,
    }))
    return NextResponse.json({ buyers: formatted })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
