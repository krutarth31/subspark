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
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  const { id } = await (ctx as { params: { id: string } | Promise<{ id: string }> }).params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const sessionDoc = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!sessionDoc) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const purchase = await db
    .collection<{
      _id: ObjectId
      userId: ObjectId
      sellerId: string
      paymentIntentId?: string
      invoiceId?: string
    }>('purchases')
    .findOne({ _id: new ObjectId(id) })
  if (!purchase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const seller = await db
    .collection<{ _id: string; userId: ObjectId }>('sellers')
    .findOne({ userId: sessionDoc.userId })
  const isBuyer = purchase.userId.equals(sessionDoc.userId)
  const isSeller = seller?._id === purchase.sellerId
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (purchase.refundReceiptUrl) {
    return NextResponse.json({ url: purchase.refundReceiptUrl })
  }

  let intentId = purchase.paymentIntentId
  if (!intentId && purchase.invoiceId) {
    try {
      const invoice = await getStripe().invoices.retrieve(
        purchase.invoiceId,
        { stripeAccount: purchase.sellerId },
      )
      if (invoice.payment_intent) {
        intentId =
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent.id
        if (intentId) {
          await db
            .collection('purchases')
            .updateOne({ _id: purchase._id }, { $set: { paymentIntentId: intentId } })
        }
      }
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Failed to retrieve invoice' }, { status: 500 })
    }
  }

  if (!intentId) {
    return NextResponse.json({ error: 'No payment intent' }, { status: 404 })
  }

  try {
    const refunds = await getStripe().refunds.list(
      { payment_intent: intentId, limit: 1 },
      { stripeAccount: purchase.sellerId },
    )
    const refund = refunds.data[0]
    if (!refund || !refund.receipt_url) {
      return NextResponse.json({ error: 'Refund receipt unavailable' }, { status: 404 })
    }
    await db
      .collection('purchases')
      .updateOne({ _id: purchase._id }, { $set: { refundReceiptUrl: refund.receipt_url } })
    return NextResponse.json({ url: refund.receipt_url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch refund receipt' }, { status: 500 })
  }
}
