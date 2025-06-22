import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import Stripe from 'stripe'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' })
  return stripe
}

const couponSchema = z.object({
  code: z.string().min(3).max(40),
  percentOff: z.number().int().positive().max(100),
  productId: z.string().optional(),
  subIndex: z.number().int().nonnegative().optional(),
})

export async function GET() {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ coupons: [] })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ coupons: [] })
    const seller = await db
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: session.userId })
    if (!seller) return NextResponse.json({ coupons: [] })
    const coupons = await db
      .collection<{
        _id: ObjectId
        code: string
        percentOff: number
        active: boolean
        productId?: ObjectId
        subIndex?: number
      }>('coupons')
      .find({ sellerId: session.userId })
      .toArray()
    const formatted = coupons.map((c) => ({
      _id: c._id.toString(),
      code: c.code,
      percentOff: c.percentOff,
      active: c.active,
      productId: c.productId ? c.productId.toString() : undefined,
      subIndex: c.subIndex,
    }))
    return NextResponse.json({ coupons: formatted })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = couponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const seller = await db
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: session.userId })
    if (!seller) return NextResponse.json({ error: 'Seller account not found' }, { status: 400 })
    const existing = await db
      .collection('coupons')
      .findOne({ sellerId: session.userId, code: parsed.data.code })
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }
    let stripeCouponId: string | undefined
    try {
      const coupon = await getStripe().coupons.create(
        { percent_off: parsed.data.percentOff, duration: 'once' },
        { stripeAccount: seller._id }
      )
      stripeCouponId = coupon.id
    } catch (err) {
      console.error('Stripe coupon creation failed', err)
      return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
    }
    const result = await db.collection('coupons').insertOne({
      sellerId: session.userId,
      code: parsed.data.code,
      percentOff: parsed.data.percentOff,
      ...(parsed.data.productId
        ? { productId: new ObjectId(parsed.data.productId) }
        : {}),
      ...(typeof parsed.data.subIndex === 'number'
        ? { subIndex: parsed.data.subIndex }
        : {}),
      stripeCouponId,
      active: true,
      createdAt: new Date(),
    })
    return NextResponse.json({ id: result.insertedId.toString() })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.id !== 'string' || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await db.collection('coupons').updateOne(
      { _id: new ObjectId(body.id), sellerId: session.userId },
      { $set: { active: body.active } }
    )
    if (!result.matchedCount) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await db
      .collection('coupons')
      .deleteOne({ _id: new ObjectId(body.id), sellerId: session.userId })
    if (!result.deletedCount) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}
