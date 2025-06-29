import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

export async function GET(
  request: Request,
  ctx: { params: { id: string } }
) {
  const { id } = ctx.params

  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()

  // Find session
  const sessionDoc = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })

  if (!sessionDoc) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find purchase
  const purchase = await db
    .collection<{
      _id: ObjectId
      userId: ObjectId
      paymentIntentId?: string
      invoiceId?: string
      sellerId: string
    }>('purchases')
    .findOne({ _id: new ObjectId(id) })

  if (!purchase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Find seller (if user is the seller)
  const seller = await db
    .collection<{ _id: string; userId: ObjectId }>('sellers')
    .findOne({ userId: sessionDoc.userId })

  const isBuyer = purchase.userId.equals(sessionDoc.userId)
  const isSeller = seller?._id === purchase.sellerId

  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let intentId = purchase.paymentIntentId

  // Retrieve PaymentIntent ID from invoice if missing
  if (!intentId && purchase.invoiceId) {
    try {
      const invoice = await getStripe().invoices.retrieve(
        purchase.invoiceId,
        { stripeAccount: purchase.sellerId }
      )
      if (invoice.payment_intent) {
        intentId = typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : invoice.payment_intent.id
        if (intentId) {
          await db
            .collection('purchases')
            .updateOne(
              { _id: purchase._id },
              { $set: { paymentIntentId: intentId } }
            )
        }
      }
    } catch (err) {
      console.error(err)
      return NextResponse.json({
        error: 'Failed to retrieve invoice',
        details: err instanceof Error ? err.message : String(err),
      }, { status: 500 })
    }
  }

  if (!intentId) {
    return NextResponse.json({ error: 'No payment' }, { status: 404 })
  }

  try {
    // Retrieve PaymentIntent and expand charges
    const intent = await getStripe().paymentIntents.retrieve(
      intentId,
      { expand: ['charges'] },
      { stripeAccount: purchase.sellerId }
    )

    let charge

    // Check expanded charges first
    if (intent.charges?.data?.length) {
      charge = intent.charges.data[0]
    } else if (intent.latest_charge) {
      // fallback: retrieve latest_charge directly
      const latestChargeId = typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge.id

      charge = await getStripe().charges.retrieve(
        latestChargeId,
        { stripeAccount: purchase.sellerId }
      )
    }

    if (!charge) {
      return NextResponse.json({
        error: 'No charge found for this PaymentIntent',
        details: `PaymentIntent status: ${intent.status}`,
      }, { status: 404 })
    }

    if (!charge.receipt_url) {
      return NextResponse.json({
        error: 'Charge has no receipt_url',
        details: charge.id,
      }, { status: 404 })
    }

    return NextResponse.json({ url: charge.receipt_url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({
      error: 'Failed to fetch receipt',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
