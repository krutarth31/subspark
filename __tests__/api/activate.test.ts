import { POST } from '@/app/api/seller/activate/route'
import { getDb } from '@/lib/mongo'

const mockRetrieve = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: { retrieve: mockRetrieve },
  }))
})

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock

describe('POST /api/seller/activate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRetrieve.mockResolvedValue({ capabilities: { card_payments: 'active' } })
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns 400 when card payments capability inactive', async () => {
    mockRetrieve.mockResolvedValue({ capabilities: { card_payments: 'inactive' } })
    mockGetDb.mockResolvedValue({ collection: jest.fn() })

    const req = new Request('http://localhost/api/seller/activate', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'acct_1' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/card payments/i)
  })

  it('activates when capability active', async () => {
    const updateOne = jest.fn()
    mockGetDb.mockResolvedValue({
      collection: () => ({ updateOne }),
    })

    const req = new Request('http://localhost/api/seller/activate', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'acct_1' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(updateOne).toHaveBeenCalled()
  })
})
