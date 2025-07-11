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

export async function POST(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as { params: { id: string } | Promise<{ id: string }> }).params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await getDb()
  const sessionDoc = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!sessionDoc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const purchase = await db
    .collection<{ _id: ObjectId; userId: ObjectId; subscriptionId?: string; sellerId: string }>('purchases')
    .findOne({ _id: new ObjectId(id), userId: sessionDoc.userId })
  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!purchase.subscriptionId)
    return NextResponse.json({ error: 'No subscription' }, { status: 400 })
  try {
    await getStripe().subscriptions.update(
      purchase.subscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: purchase.sellerId },
    )
    await db.collection('purchases').updateOne({ _id: purchase._id }, { $set: { status: 'canceled' } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
