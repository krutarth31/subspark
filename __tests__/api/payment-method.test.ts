import { POST } from '@/app/api/purchases/[id]/payment-method/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockPortalCreate = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    billingPortal: { sessions: { create: mockPortalCreate } },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('POST /api/purchases/[id]/payment-method', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns 401 when unauthenticated', async () => {
    mockCookies.mockReturnValue({ get: () => undefined })
    mockGetDb.mockResolvedValue({ collection: jest.fn() })
    const id = '507f191e810c19729de860aa'
    const req = new Request(`http://localhost/api/purchases/${id}/payment-method`, { method: 'POST' })
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown purchase', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860ab') }
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })
    const id = '507f191e810c19729de860ac'
    const req = new Request(`http://localhost/api/purchases/${id}/payment-method`, { method: 'POST' })
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when purchase has no customer', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860ad') }
    const purchase = { _id: new ObjectId('507f191e810c19729de860ae'), userId: session.userId, sellerId: 'acct_1' }
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        return { findOne: jest.fn() }
      },
    })
    const id = purchase._id.toString()
    const req = new Request(`http://localhost/api/purchases/${id}/payment-method`, { method: 'POST' })
    const res = await POST(req, { params: { id } })
    expect(res.status).toBe(400)
  })

  it('creates billing portal session', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860af') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860b0'),
      userId: session.userId,
      customerId: 'cus_1',
      sellerId: 'acct_1',
    }
    mockPortalCreate.mockResolvedValue({ url: 'portal_url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        return { findOne: jest.fn() }
      },
    })
    const id = purchase._id.toString()
    const req = new Request(`http://localhost/api/purchases/${id}/payment-method`, { method: 'POST' })
    const res = await POST(req, { params: { id } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('portal_url')
    expect(mockPortalCreate).toHaveBeenCalledWith(
      { customer: 'cus_1', return_url: expect.any(String) },
      { stripeAccount: 'acct_1' }
    )
  })

  it('uses configuration when provided', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860af') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860b0'),
      userId: session.userId,
      customerId: 'cus_1',
      sellerId: 'acct_1',
    }
    process.env.STRIPE_PORTAL_CONFIG_ID = 'pc_123'
    mockPortalCreate.mockResolvedValue({ url: 'portal_url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        return { findOne: jest.fn() }
      },
    })
    const id = purchase._id.toString()
    const req = new Request(`http://localhost/api/purchases/${id}/payment-method`, { method: 'POST' })
    const res = await POST(req, { params: { id } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('portal_url')
    expect(mockPortalCreate).toHaveBeenCalledWith(
      { customer: 'cus_1', return_url: expect.any(String), configuration: 'pc_123' },
      { stripeAccount: 'acct_1' }
    )
    delete process.env.STRIPE_PORTAL_CONFIG_ID
  })
})
