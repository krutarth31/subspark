import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().optional(),
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
        description?: string
        type: string
        status: string
        createdAt: Date
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
    const product = {
      ...parsed.data,
      userId: session.userId,
      archived: false,
      createdAt: new Date(),
    }
    const result = await db.collection('products').insertOne(product)
    return NextResponse.json({ id: result.insertedId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
