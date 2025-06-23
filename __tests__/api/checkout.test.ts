import { POST } from '@/app/api/checkout/[id]/route'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo'

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn() } },
    accounts: { retrieve: jest.fn().mockResolvedValue({ charges_enabled: true }) },
  }))
})

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock

describe('POST /api/checkout/[id]', () => {
  beforeEach(() => {
    jest.resetAllMocks()
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
})
