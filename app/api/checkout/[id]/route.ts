import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import Stripe from 'stripe'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' })
  return stripe
}

export async function POST(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as {
    params: { id: string } | Promise<{ id: string }>
  }).params
  try {
    const db = await getDb()
    const cookieStore = cookies()
    const token = cookieStore.get('session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const sessionDoc = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!sessionDoc) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = sessionDoc.userId
    const product = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        stripePriceId?: string
        billing: string
        subProducts?: {
          name?: string
          billing: string
          price?: number
          currency: string
          period?: string
          stripePriceId?: string
        }[]
      }>('products')
      .findOne({ _id: new ObjectId(id) })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const body = await request.json().catch(() => null)
    const billing = body?.sub || product.billing
    const subIndex: number | undefined =
      typeof body?.subIndex === 'number' ? body.subIndex : undefined
    let stripeCouponId: string | undefined
    if (body?.coupon) {
      const or: any[] = [
        { productId: { $exists: false } },
        { productId: product._id, subIndex: { $exists: false } },
      ]
      if (typeof subIndex === 'number') {
        or.unshift({ productId: product._id, subIndex })
      }
      const coupon = await db
        .collection<{
          code: string
          stripeCouponId: string
          sellerId: ObjectId
          active: boolean
          productId?: ObjectId
          subIndex?: number
        }>('coupons')
        .findOne({
          code: body.coupon as string,
          sellerId: product.userId,
          active: true,
          $or: or,
        })
      if (!coupon) {
        return NextResponse.json({ error: 'Invalid coupon' }, { status: 400 })
      }
      stripeCouponId = coupon.stripeCouponId
    }
    const option = Array.isArray(product.subProducts)
      ? typeof subIndex === 'number'
        ? product.subProducts[subIndex]
        :
            product.subProducts.find((o) =>
              o.name ? o.name === billing : o.billing === billing,
            ) || product.subProducts[0]
      : { billing: product.billing, stripePriceId: product.stripePriceId }
    if (!option) {
      return NextResponse.json({ error: 'Billing option not found' }, { status: 400 })
    }
    if (option.billing !== 'free' && !option.stripePriceId) {
      return NextResponse.json({ error: 'Billing option invalid' }, { status: 400 })
    }
    const seller = await db
      .collection<{ _id: string; active?: boolean }>('sellers')
      .findOne({ userId: product.userId })
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 500 })
    }
    if (!seller.active) {
      return NextResponse.json(
        { error: 'Seller account inactive' },
        { status: 400 }
      )
    }
    const account = await getStripe().accounts.retrieve(seller._id)
    if (account.capabilities?.card_payments !== 'active') {
      // automatically request the capability so sellers can finish onboarding
      await getStripe().accounts.update(seller._id, {
        capabilities: { card_payments: { requested: true } },
      })
      return NextResponse.json(
        { error: 'Seller account not ready for card payments' },
        { status: 400 }
      )
    }
    const { origin } = new URL(request.url)
    const purchaseRes = await db.collection('purchases').insertOne({
      userId,
      productId: product._id,
      sellerId: seller._id,
      status: option.billing === 'free' ? 'paid' : 'pending',
      createdAt: new Date(),
    })
    if (option.billing === 'free') {
      return NextResponse.json({ url: `${origin}/purchases?success=1` })
    }
    const session = await getStripe().checkout.sessions.create(
      {
        mode: option.billing === 'recurring' ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: option.stripePriceId!, quantity: 1 }],
        ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
        success_url: `${origin}/purchases?success=1`,
        cancel_url: `${origin}/buy/${id}`,
        metadata: {
          purchaseId: purchaseRes.insertedId.toString(),
        },
      },
      { stripeAccount: seller._id }
    )
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
