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
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    const product = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        stripePriceId?: string
        billing: string
      }>('products')
      .findOne({ _id: new ObjectId(params.id) })
    if (!product || !product.stripePriceId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const seller = await db
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: product.userId })
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 500 })
    }
    const { origin } = new URL(request.url)
    const session = await getStripe().checkout.sessions.create(
      {
        mode: product.billing === 'recurring' ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: product.stripePriceId, quantity: 1 }],
        success_url: `${origin}/products/${params.id}?success=1`,
        cancel_url: `${origin}/products/${params.id}?canceled=1`,
      },
      { stripeAccount: seller._id }
    )
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
