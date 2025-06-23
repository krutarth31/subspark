import { POST } from '@/app/api/checkout/[id]/route'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo'

const mockRetrieve = jest
  .fn()
  .mockResolvedValue({ capabilities: { card_payments: 'active' } })
const mockUpdate = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
    accounts: { retrieve: mockRetrieve, update: mockUpdate },
  }))
})

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock

describe('POST /api/checkout/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRetrieve.mockResolvedValue({ capabilities: { card_payments: 'active' } })
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns 404 for unknown product', async () => {
    mockGetDb.mockResolvedValue({
      collection: () => ({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    })

    const id = '507f1f77bcf86cd799439011'
    const req = new Request(`http://localhost/api/checkout/${id}`, { method: 'POST' })
    const res = await POST(req, { params: { id } })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Product not found')
  })

  it('returns 400 for invalid billing option', async () => {
    const product = {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      userId: new ObjectId('507f1f77bcf86cd799439012'),
      billing: 'recurring',
    }

    mockGetDb.mockResolvedValue({
      collection: (name: string) => ({
        findOne: jest.fn().mockResolvedValue(name === 'products' ? product : null),
      }),
    })

    const id = '507f1f77bcf86cd799439011'
    const req = new Request(`http://localhost/api/checkout/${id}`, { method: 'POST' })
    const res = await POST(req, { params: { id } })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Billing option/)
  })

  it('returns 400 when seller card payments not active', async () => {
    const product = {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      userId: new ObjectId('507f1f77bcf86cd799439012'),
      billing: 'one-time',
      stripePriceId: 'price_123',
    }

    mockRetrieve.mockResolvedValue({ capabilities: { card_payments: 'inactive' } })

    mockGetDb.mockResolvedValue({
      collection: (name: string) => ({
        findOne: jest.fn().mockResolvedValue(name === 'products' ? product : { _id: 'acct_1', active: true }),
      }),
    })

    const id = '507f1f77bcf86cd799439011'
    const req = new Request(`http://localhost/api/checkout/${id}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: { id } })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/card payments/)
    expect(mockUpdate).toHaveBeenCalledWith('acct_1', {
      capabilities: { card_payments: { requested: true } },
    })
  })
})
