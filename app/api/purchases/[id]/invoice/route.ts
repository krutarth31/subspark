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
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as { params: { id: string } | Promise<{ id: string }> }).params
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await getDb()
  const sessionDoc = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!sessionDoc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const purchase = await db
    .collection<{
      _id: ObjectId
      userId: ObjectId
      invoiceId?: string
      sellerId: string
    }>('purchases')
    .findOne({ _id: new ObjectId(id) })
  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const seller = await db
    .collection<{ _id: string; userId: ObjectId }>('sellers')
    .findOne({ userId: sessionDoc.userId })
  const isBuyer = purchase.userId.equals(sessionDoc.userId)
  const isSeller = seller?._id === purchase.sellerId
  if (!isBuyer && !isSeller)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!purchase.invoiceId)
    return NextResponse.json({ error: 'No invoice' }, { status: 404 })
  try {
    const invoice = await getStripe().invoices.retrieve(purchase.invoiceId, {
      stripeAccount: purchase.sellerId,
    })
    return NextResponse.json({ url: invoice.invoice_pdf })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
