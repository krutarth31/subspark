import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { socket, response } = NextResponse.upgrade(req)

  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  const db = await getDb()
  const session = token
    ? await db.collection<{ token: string; userId: ObjectId }>('sessions').findOne({ token })
    : null
  const seller = session
    ? await db.collection<{ _id: string }>('sellers').findOne({ userId: session.userId })
    : null

  if (!seller) {
    socket.close()
    return response
  }

  const prevIds = new Set<string>()
  const prevStatuses: Record<string, string | undefined> = {}

  async function poll() {
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
        refundRequest?: { status: string }
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
            price: '$product.price',
            currency: '$product.currency',
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
      price: p.price,
      currency: p.currency,
      productName: p.productName,
      buyerName: p.buyerName,
      buyerEmail: p.buyerEmail,
      refundRequest: p.refundRequest,
    }))

    formatted.forEach((b) => {
      let event: 'purchase' | 'refund_requested' | null = null
      if (!prevIds.has(b._id)) {
        prevIds.add(b._id)
        event = 'purchase'
      } else {
        const prev = prevStatuses[b._id]
        if (prev && prev !== b.refundRequest?.status && b.refundRequest?.status === 'requested') {
          event = 'refund_requested'
        }
      }
      prevStatuses[b._id] = b.refundRequest?.status
      if (event) {
        socket.send(JSON.stringify({ type: 'update', event, purchase: b }))
      }
    })
  }

  poll()
  const timer = setInterval(poll, 20000)
  socket.addEventListener('close', () => clearInterval(timer))

  return response
}
