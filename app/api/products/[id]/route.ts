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

const billingOptionSchema = z.object({
  name: z.string().optional(),
  billing: z.enum(['free', 'one', 'recurring']),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(4).default('USD'),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  service: z.string().optional(),
  roleId: z.string().optional(),
})

const productSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(4).optional(),
  billing: z.enum(['free', 'one', 'recurring']).optional(),
  subProducts: z.array(billingOptionSchema).optional(),
  description: z.string().optional(),
  planDescription: z.string().optional(),
  availableUnits: z
    .number()
    .int()
    .positive()
    .nullish(),
  unlimited: z.boolean().optional(),
  expireDays: z.number().int().positive().nullish(),
  type: z.enum(['discord', 'file', 'key']).optional(),
  status: z.enum(['draft', 'published']).optional(),
  deliveryFile: z.string().optional(),
  serverId: z.string().optional(),
  roleId: z.string().optional(),
  licenseKeys: z.string().optional(),
  imageUrl: z.string().optional(),
})

const updateSchema = productSchema.extend({
  subIndex: z.number().int().nonnegative().optional(),
})

export async function GET(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as {
    params: { id: string } | Promise<{ id: string }>
  }).params
  try {
    const db = await getDb()
    const product = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        name: string
        price: number
        currency: string
        billing: string
        subProducts?: {
          name?: string
          billing: string
          price?: number
          currency: string
          period?: string
          stripePriceId?: string
          service?: string
          roleId?: string
        }[]
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
        imageUrl?: string
        stripeProductId?: string
        stripePriceId?: string
      }>('products')
      .findOne({ _id: new ObjectId(id) })
    if (!product) return NextResponse.json({ product: null }, { status: 404 })
    return NextResponse.json({ product })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as {
    params: { id: string } | Promise<{ id: string }>
  }).params
  try {
    const body = await request.json().catch(() => null)
    const parsed = updateSchema.safeParse(body)
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
    
    const { subIndex, ...data } = parsed.data

    // Allow quick role updates without touching Stripe
    if (typeof subIndex === 'number' && 'roleId' in parsed.data) {
      await db.collection('products').updateOne(
        { _id: new ObjectId(id), userId: session.userId },
        {
          $set: {
            [`subProducts.${subIndex}.roleId`]: parsed.data.roleId || undefined,
            ...(parsed.data.serverId ? { serverId: parsed.data.serverId } : {}),
            updatedAt: new Date(),
          },
        }
      )
      return NextResponse.json({ ok: true })
    }

    const product = await db
      .collection<{
        stripeProductId?: string
        subProducts?: {
          billing: string
          price?: number
          currency: string
          period?: string
          stripePriceId?: string
        }[]
        imageUrl?: string
      }>('products')
      .findOne({ _id: new ObjectId(id), userId: session.userId })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const seller = await db
      .collection<{ _id: string }>('sellers')
      .findOne({ userId: session.userId })
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 400 })

    let stripeProductId = product.stripeProductId
    try {
      if (stripeProductId) {
        await getStripe().products.update(
          stripeProductId,
          {
            name: data.name || product.name,
            description: data.description || product.description || undefined,
          },
          { stripeAccount: seller._id }
        )
      } else {
        const stripeProd = await getStripe().products.create(
          {
            name: data.name || product.name,
            description: data.description || product.description || undefined,
          },
          { stripeAccount: seller._id }
        )
        stripeProductId = stripeProd.id
      }
    } catch (err) {
      console.error('Stripe product update failed', err)
    }

    const newSubs = Array.isArray(data.subProducts) ? data.subProducts : []
    const updatedSubs: typeof newSubs = []
    let firstPriceId: string | undefined = undefined
    for (let i = 0; i < newSubs.length; i++) {
      const sub = newSubs[i]
      const prev = product.subProducts?.[i]
      let stripePriceId = prev?.stripePriceId
      if (sub.billing === 'free') {
        stripePriceId = undefined
      } else {
        const changed =
          !stripePriceId ||
          prev?.billing !== sub.billing ||
          prev?.price !== sub.price ||
          prev?.currency !== sub.currency ||
          prev?.period !== sub.period
        if (changed && typeof sub.price === 'number') {
          const params: Stripe.PriceCreateParams = {
            unit_amount: Math.round(sub.price * 100),
            currency: sub.currency.toLowerCase(),
            product: stripeProductId!,
          }
          if (sub.billing === 'recurring' && sub.period) {
            params.recurring = {
              interval: sub.period as Stripe.PriceCreateParams.Recurring.Interval,
            }
          }
          try {
            const price = await getStripe().prices.create(params, {
              stripeAccount: seller._id,
            })
            stripePriceId = price.id
          } catch (err) {
            console.error('Stripe price create failed', err)
          }
        }
      }
      const entry = { ...sub, stripePriceId }
      updatedSubs.push(entry)
      if (i === 0) firstPriceId = stripePriceId
    }

    const update: Record<string, unknown> = {
      ...data,
      subProducts: updatedSubs,
      billing: updatedSubs[0]?.billing ?? data.billing,
      price:
        updatedSubs[0]?.billing === 'free'
          ? 0
          : updatedSubs[0]?.price ?? data.price,
      currency: updatedSubs[0]?.currency ?? data.currency,
      period: updatedSubs[0]?.period ?? data.period,
      roleId: updatedSubs[0]?.roleId ?? data.roleId,
      stripeProductId,
      stripePriceId: firstPriceId,
    }

    await db.collection('products').updateOne(
      { _id: new ObjectId(id), userId: session.userId },
      { $set: { ...update, updatedAt: new Date() } }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await (ctx as {
    params: { id: string } | Promise<{ id: string }>
  }).params
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await db.collection('products').updateOne(
      { _id: new ObjectId(id), userId: session.userId },
      { $set: { archived: true } }
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 })
  }
}
