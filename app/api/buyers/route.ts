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
            price: '$product.price',
            currency: '$product.currency',
            productName: '$product.name',
            subProducts: '$product.subProducts',
            buyerName: '$user.name',
            buyerEmail: '$user.email',
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray()
    const formatted = [] as any[]
    for (const p of purchases) {
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
            if (
              p.status !== 'canceled' &&
              p.status !== 'refunded' &&
              sub.status !== 'canceled' &&
              sub.current_period_end
            )
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
      formatted.push({
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
        subProduct,
        nextDueDate,
      })
    }
    return NextResponse.json({ buyers: formatted })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
