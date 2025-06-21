import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { z } from 'zod'

const billingOptionSchema = z.object({
  billing: z.enum(['free', 'one', 'recurring']),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(4).default('USD'),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
})

const productSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(4).optional(),
  billing: z.enum(['free', 'one', 'recurring']).optional(),
  billingOptions: z.array(billingOptionSchema).optional(),
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
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    const id = params.id
    const product = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        name: string
        price: number
        currency: string
        billing: string
        billingOptions?: {
          billing: string
          price?: number
          currency: string
          period?: string
          stripePriceId?: string
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
  { params }: { params: { id: string } }
) {
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
    const id = params.id
    const update: Record<string, unknown> = { ...parsed.data }
    if (Array.isArray(parsed.data.billingOptions) && parsed.data.billingOptions.length > 0) {
      const opt = parsed.data.billingOptions[0]
      update.billing = opt.billing
      update.price = opt.billing === 'free' ? 0 : opt.price
      update.currency = opt.currency
      update.period = opt.period
    } else if (update.billing === 'free') {
      update.price = 0
    }
    await db
      .collection('products')
      .updateOne(
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
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb()
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = params.id
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
