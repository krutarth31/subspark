import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' })
  return stripe
}

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    return new Response('No signature', { status: 400 })
  }
  const body = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook error', err)
    return new Response('Webhook Error', { status: 400 })
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const ready = account.charges_enabled && account.details_submitted
    if (!ready) {
      try {
        const db = await getDb()
        await db
          .collection<{ _id: string; active: boolean }>('sellers')
          .updateOne(
            { _id: account.id },
            { $set: { active: false } },
            { upsert: true }
          )
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const accountId = session.metadata?.accountId
    if (session.metadata?.purchaseId) {
      try {
        const db = await getDb()
        await db
          .collection<{ _id: ObjectId; status: string }>('purchases')
          .updateOne(
            { _id: new ObjectId(session.metadata.purchaseId) },
            { $set: { status: 'paid' } }
          )
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
    if (accountId) {
      try {
        const db = await getDb()
        await db
          .collection<{ _id: string; active: boolean }>('sellers')
          .updateOne({ _id: accountId }, { $set: { active: true } }, { upsert: true })
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
