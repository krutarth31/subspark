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

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().min(3).max(4).default('USD'),
  billing: z.enum(['free', 'one', 'recurring']).default('one'),
  description: z.string().optional(),
  planDescription: z.string().optional(),
  availableUnits: z
    .number()
    .int()
    .positive()
    .nullish(),
  unlimited: z.boolean().optional(),
  expireDays: z.number().int().positive().nullish(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  type: z.enum(['discord', 'file', 'key']),
  status: z.enum(['draft', 'published']).default('draft'),
  deliveryFile: z.string().optional(),
  serverId: z.string().optional(),
  roleId: z.string().optional(),
  licenseKeys: z.string().optional(),
})

export async function GET() {
  const db = await getDb()
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ products: [] })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ products: [] })
    const products = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        name: string
        price: number
        currency: string
        billing: string
        description?: string
        planDescription?: string
        availableUnits?: number
        unlimited?: boolean
        expireDays?: number
        period?: string
        type: string
        status: string
        createdAt: Date
        updatedAt?: Date
        sales?: number
        archived?: boolean
        deliveryFile?: string
        serverId?: string
        roleId?: string
        licenseKeys?: string
        stripeProductId?: string
        stripePriceId?: string
      }>('products')
      .find({ userId: session.userId, archived: { $ne: true } })
      .toArray()
    return NextResponse.json({ products })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = productSchema.safeParse(body)
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
    if (!seller) {
      return NextResponse.json({ error: 'Seller account not found' }, { status: 400 })
    }

    const { billing } = parsed.data
    let stripeProductId: string | undefined
    let stripePriceId: string | undefined

    try {
      const stripeProd = await getStripe().products.create(
        {
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        },
        { stripeAccount: seller._id }
      )
      stripeProductId = stripeProd.id
      if (billing !== 'free') {
        const priceParams: Stripe.PriceCreateParams = {
          unit_amount: Math.round(parsed.data.price * 100),
          currency: parsed.data.currency.toLowerCase(),
          product: stripeProd.id,
        }
        if (billing === 'recurring' && parsed.data.period) {
          priceParams.recurring = {
            interval: parsed.data.period as Stripe.PriceCreateParams.Recurring.Interval,
          }
        }
        const stripePrice = await getStripe().prices.create(priceParams, {
          stripeAccount: seller._id,
        })
        stripePriceId = stripePrice.id
      }
    } catch (err) {
      console.error('Stripe product creation failed', err)
      return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
    }

    const product = {
      ...parsed.data,
      price: billing === 'free' ? 0 : parsed.data.price,
      userId: session.userId,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      sales: 0,
      stripeProductId,
      stripePriceId,
    }
    const result = await db.collection('products').insertOne(product)
    return NextResponse.json({ id: result.insertedId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
