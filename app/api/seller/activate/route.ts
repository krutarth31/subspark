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

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }
    const db = await getDb()
    let userId: ObjectId | null = null
    let userInfo: { name: string; email: string; accountId?: string } | null = null
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('session')?.value
      if (token) {
        const session = await db
          .collection<{ token: string; userId: ObjectId }>('sessions')
          .findOne({ token })
        if (session) {
          userId = session.userId
          const u = await db
            .collection<{ _id: ObjectId; name: string; email: string; accountId?: string }>('users')
            .findOne({ _id: session.userId }, { projection: { name: 1, email: 1, accountId: 1 } })
          if (u) userInfo = { name: u.name, email: u.email, accountId: u.accountId }
        }
      }
    } catch {
      // ignore
    }
    const account = await getStripe().accounts.retrieve(accountId)
    if (account.capabilities?.card_payments !== 'active') {
      return NextResponse.json(
        { error: 'Enable card payments in Stripe before activating.' },
        { status: 400 }
      )
    }
    await db
      .collection<{ _id: string; active: boolean; userId?: ObjectId; name?: string; email?: string; accountId?: string }>('sellers')
      .updateOne(
        { _id: accountId },
        { $set: { active: true, userId, ...(userInfo ?? {}) } },
        { upsert: true }
      )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to activate' }, { status: 500 })
  }
}
