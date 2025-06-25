import { GET } from '@/app/api/buyers/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/buyers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
