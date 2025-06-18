import { NextResponse } from 'next/server'
import Stripe from 'stripe'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' })
  return stripe
}

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }
    const price = process.env.STRIPE_PRICE_ID
    if (!price) {
      return NextResponse.json({ error: 'STRIPE_PRICE_ID not set' }, { status: 500 })
    }
    const { origin } = new URL(request.url)
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/price`,
      metadata: { accountId },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
