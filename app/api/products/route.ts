import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().min(3).max(4).default('USD'),
  billing: z.enum(['free', 'one', 'recurring']).default('one'),
  description: z.string().optional(),
  planDescription: z.string().optional(),
  availableUnits: z.number().int().positive().optional(),
  unlimited: z.boolean().optional(),
  expireDays: z.number().int().positive().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  type: z.enum(['discord', 'file', 'key']),
  status: z.enum(['draft', 'published']).default('draft'),
})

export async function GET() {
  const db = await getDb()
  try {
    const token = cookies().get('session')?.value
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
    const token = cookies().get('session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await db
      .collection<{ token: string; userId: ObjectId }>('sessions')
      .findOne({ token })
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { billing } = parsed.data
    const product = {
      ...parsed.data,
      price: billing === 'free' ? 0 : parsed.data.price,
      userId: session.userId,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      sales: 0,
    }
    const result = await db.collection('products').insertOne(product)
    return NextResponse.json({ id: result.insertedId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
