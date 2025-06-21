import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
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
    const option = Array.isArray(product.subProducts)
      ? product.subProducts.find((o) =>
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
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: product.userId })
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 500 })
    }
    const { origin } = new URL(request.url)
    if (option.billing === 'free') {
      return NextResponse.json({ url: `${origin}/products/${id}?success=1` })
    }
    const session = await getStripe().checkout.sessions.create(
      {
        mode: option.billing === 'recurring' ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: option.stripePriceId!, quantity: 1 }],
        success_url: `${origin}/products/${id}?success=1`,
        cancel_url: `${origin}/products/${id}?canceled=1`,
      },
      { stripeAccount: seller._id }
    )
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
