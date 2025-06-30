import { GET } from '@/app/api/purchases/route'
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

describe('GET /api/purchases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns purchases for seller buyer', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86201') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86202'),
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86203'),
      sellerId: 'acct_other',
      status: 'paid',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      paymentIntentId: 'pi_1',
    }
    const aggregate = jest.fn().mockReturnValue({ toArray: () => [purchase] })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { aggregate }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_self' }) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.purchases.length).toBe(1)
    expect(json.purchases[0].sellerId).toBe('acct_other')
    expect(aggregate).toHaveBeenCalled()
  })

  it('includes sub product and next due date', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86210') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86211'),
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86212'),
      sellerId: 'acct_1',
      status: 'paid',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      subscriptionId: 'sub_1',
    }
    const product = {
      _id: purchase.productId,
      name: 'Prod',
      price: 10,
      currency: 'usd',
      subProducts: [{ name: 'Gold', stripePriceId: 'price_1' }],
    }
    const aggregate = jest.fn().mockReturnValue({
      toArray: () => [{ ...purchase, ...product }],
    })
    mockRetrieveSub.mockResolvedValue({
      current_period_end: 1700000000,
      items: { data: [{ price: { id: 'price_1' } }] },
    })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { aggregate }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.purchases[0].subProduct).toBe('Gold')
    expect(json.purchases[0].nextDueDate).toBe(new Date(1700000000 * 1000).toISOString())
  })

  it('removes due date when canceled', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86213') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86214'),
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86215'),
      sellerId: 'acct_1',
      status: 'canceled',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      subscriptionId: 'sub_2',
    }
    const product = {
      _id: purchase.productId,
      name: 'Prod',
      price: 10,
      currency: 'usd',
      subProducts: [{ name: 'Gold', stripePriceId: 'price_1' }],
    }
    const aggregate = jest.fn().mockReturnValue({
      toArray: () => [{ ...purchase, ...product }],
    })
    mockRetrieveSub.mockResolvedValue({
      current_period_end: 1700000000,
      status: 'canceled',
      items: { data: [{ price: { id: 'price_1' } }] },
    })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { aggregate }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.purchases[0].nextDueDate).toBeUndefined()
  })
})
