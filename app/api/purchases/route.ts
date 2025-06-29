import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'
import Stripe from 'stripe'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(key, { apiVersion: '2022-11-15' })
  return stripe
}

export async function GET() {
  const db = await getDb()
  const cookieStore = await cookies()
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
          subProducts: '$product.subProducts',
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
  const purchases = [] as any[]
  for (const p of rawPurchases) {
    let subProduct: string | undefined
    let nextDueDate: string | undefined
    let priceId: string | undefined
    if (p.subscriptionId) {
      try {
        const sub = await getStripe().subscriptions.retrieve(
          p.subscriptionId,
          { expand: ['items'] },
          { stripeAccount: p.sellerId },
        )
        priceId = sub.items.data[0]?.price?.id
        if (sub.current_period_end)
          nextDueDate = new Date(sub.current_period_end * 1000).toISOString()
      } catch (err) {
        console.error(err)
      }
    } else if (p.invoiceId) {
      try {
        const inv = await getStripe().invoices.retrieve(
          p.invoiceId,
          { expand: ['lines'] },
          { stripeAccount: p.sellerId },
        )
        const price = inv.lines?.data?.[0]?.price
        if (price)
          priceId = typeof price === 'string' ? price : (price as any).id
      } catch (err) {
        console.error(err)
      }
    }
    if (priceId && Array.isArray((p as any).subProducts)) {
      const opt = (p as any).subProducts.find(
        (s: any) => s.stripePriceId === priceId,
      )
      if (opt) subProduct = opt.name || opt.billing
    }
    purchases.push({
      ...p,
      _id: p._id.toString(),
      productId: p.productId.toString(),
      createdAt: p.createdAt.toISOString(),
      subProduct,
      nextDueDate,
    })
  }
  return NextResponse.json({ purchases })
}
