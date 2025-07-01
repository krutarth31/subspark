import { GET } from '@/app/api/buyers/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRetrieveSub = jest.fn()
const mockRetrieveInv = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: { retrieve: mockRetrieveSub },
    invoices: { retrieve: mockRetrieveInv },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/buyers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns empty array when unauthenticated', async () => {
    mockCookies.mockReturnValue({ get: () => undefined })
    mockGetDb.mockResolvedValue({ collection: jest.fn() })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.buyers).toEqual([])
  })

  it('returns buyers list for seller', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860ea') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860eb'),
      userId: new ObjectId('507f191e810c19729de860ec'),
      productId: new ObjectId('507f191e810c19729de860ed'),
      status: 'paid',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      paymentIntentId: 'pi_1',
      sellerId: 'acct_1',
      buyerName: 'Buyer',
      buyerEmail: 'b@example.com',
      productName: 'Prod',
    }
    const aggregate = jest.fn().mockReturnValue({ toArray: () => [purchase] })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        if (name === 'purchases') return { aggregate }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.buyers.length).toBe(1)
    expect(json.buyers[0].productName).toBe('Prod')
    expect(aggregate).toHaveBeenCalled()
  })

  it('includes sub product and next due date', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de861ea') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de861eb'),
      userId: new ObjectId('507f191e810c19729de861ec'),
      productId: new ObjectId('507f191e810c19729de861ed'),
      status: 'paid',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      subscriptionId: 'sub_1',
      sellerId: 'acct_1',
      buyerName: 'Buyer',
      buyerEmail: 'b@example.com',
      productName: 'Prod',
      price: 10,
      currency: 'usd',
      subProducts: [{ name: 'Gold', stripePriceId: 'price_1' }],
    }
    const aggregate = jest.fn().mockReturnValue({ toArray: () => [purchase] })
    mockRetrieveSub.mockResolvedValue({
      current_period_end: 1700000000,
      items: { data: [{ price: { id: 'price_1' } }] },
    })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        if (name === 'purchases') return { aggregate }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.buyers[0].subProduct).toBe('Gold')
    expect(json.buyers[0].nextDueDate).toBe(new Date(1700000000 * 1000).toISOString())
  })

  it('omits due date when canceled', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de861ee') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de861ef'),
      userId: new ObjectId('507f191e810c19729de861f0'),
      productId: new ObjectId('507f191e810c19729de861f1'),
      status: 'canceled',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      subscriptionId: 'sub_2',
      sellerId: 'acct_1',
      buyerName: 'Buyer',
      buyerEmail: 'b@example.com',
      productName: 'Prod',
      price: 10,
      currency: 'usd',
      subProducts: [{ name: 'Gold', stripePriceId: 'price_1' }],
    }
    const aggregate = jest.fn().mockReturnValue({ toArray: () => [purchase] })
    mockRetrieveSub.mockResolvedValue({
      current_period_end: 1700000000,
      status: 'canceled',
      items: { data: [{ price: { id: 'price_1' } }] },
    })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        if (name === 'purchases') return { aggregate }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
  expect(json.buyers[0].nextDueDate).toBeUndefined()
  })

  it('omits due date when refunded', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de861f2') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de861f3'),
      userId: new ObjectId('507f191e810c19729de861f4'),
      productId: new ObjectId('507f191e810c19729de861f5'),
      status: 'refunded',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      subscriptionId: 'sub_3',
      sellerId: 'acct_1',
      buyerName: 'Buyer',
      buyerEmail: 'b@example.com',
      productName: 'Prod',
      price: 10,
      currency: 'usd',
      subProducts: [{ name: 'Gold', stripePriceId: 'price_1' }],
    }
    const aggregate = jest.fn().mockReturnValue({ toArray: () => [purchase] })
    mockRetrieveSub.mockResolvedValue({
      current_period_end: 1700000000,
      items: { data: [{ price: { id: 'price_1' } }] },
    })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        if (name === 'purchases') return { aggregate }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.buyers[0].nextDueDate).toBeUndefined()
  })
})
