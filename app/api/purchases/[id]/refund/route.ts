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

async function getPaymentIntentId(
  purchase: {
    _id: ObjectId
    paymentIntentId?: string
    invoiceId?: string
    sellerId: string
  },
  db: Awaited<ReturnType<typeof getDb>>,
) {
  let intentId = purchase.paymentIntentId
  if (!intentId && purchase.invoiceId) {
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
  }
  return intentId
}

async function getContext(ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const { id } = await (ctx as { params: { id: string } | Promise<{ id: string }> }).params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const db = await getDb()
  const sessionDoc = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!sessionDoc)
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const purchase = await db
    .collection<{
      _id: ObjectId
      userId: ObjectId
      paymentIntentId?: string
      invoiceId?: string
      sellerId: string
      refundRequest?: any
    }>('purchases')
    .findOne({ _id: new ObjectId(id) })
  if (!purchase) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const seller = await db
    .collection<{ _id: string; userId: ObjectId }>('sellers')
    .findOne({ userId: sessionDoc.userId })
  const isBuyer = purchase.userId.equals(sessionDoc.userId)
  const isSeller = seller?._id === purchase.sellerId
  if (!isBuyer && !isSeller)
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  return { db, purchase, isBuyer, isSeller }
}

export async function POST(request: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const ctxRes = await getContext(ctx)
  if ('error' in ctxRes) return ctxRes.error
  const { db, purchase, isBuyer } = ctxRes
  if (!isBuyer)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason : ''
  await db.collection('purchases').updateOne(
    { _id: purchase._id },
    {
      $set: {
        status: 'refund_requested',
        refundRequest: { status: 'requested', reason },
      },
    },
  )
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const ctxRes = await getContext(ctx)
  if ('error' in ctxRes) return ctxRes.error
  const { db, purchase, isSeller } = ctxRes
  if (!isSeller)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json().catch(() => ({}))
  const action = body.action
  if (action === 'approve') {
    if (purchase.refundRequest?.status !== 'requested')
      return NextResponse.json({ error: 'No request' }, { status: 400 })
    let intentId: string | undefined
    try {
      intentId = await getPaymentIntentId(purchase, db)
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Failed to retrieve invoice' }, { status: 500 })
    }
    if (!intentId)
      return NextResponse.json({ error: 'No payment intent' }, { status: 400 })
    try {
      await getStripe().refunds.create(
        { payment_intent: intentId },
        { stripeAccount: purchase.sellerId }
      )
      await db.collection('purchases').updateOne(
        { _id: purchase._id },
        { $set: { status: 'refunded', 'refundRequest.status': 'approved' } }
      )
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Failed to refund' }, { status: 500 })
    }
  } else if (action === 'refund') {
    let intentId: string | undefined
    try {
      intentId = await getPaymentIntentId(purchase, db)
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Failed to retrieve invoice' }, { status: 500 })
    }
    if (!intentId)
      return NextResponse.json({ error: 'No payment intent' }, { status: 400 })
    try {
      await getStripe().refunds.create(
        { payment_intent: intentId },
        { stripeAccount: purchase.sellerId }
      )
      await db.collection('purchases').updateOne(
        { _id: purchase._id },
        {
          $set: {
            status: 'refunded',
            'refundRequest.status': 'approved',
          },
        }
      )
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Failed to refund' }, { status: 500 })
    }
  } else if (action === 'decline') {
    const reason = typeof body.reason === 'string' ? body.reason : ''
    await db.collection('purchases').updateOne(
      { _id: purchase._id },
      { $set: { 'refundRequest.status': 'declined', 'refundRequest.sellerReason': reason } }
    )
    return NextResponse.json({ ok: true })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
