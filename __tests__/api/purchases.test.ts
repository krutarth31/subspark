import { GET } from '@/app/api/purchases/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/purchases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
