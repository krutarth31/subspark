import { GET } from '@/app/api/purchases/[id]/invoice/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRetrieve = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    invoices: { retrieve: mockRetrieve },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/purchases/[id]/invoice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('allows buyer to download invoice', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860fa') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860fb'),
      userId: session.userId,
      invoiceId: 'in_1',
      sellerId: 'acct_1',
    }
    mockRetrieve.mockResolvedValue({ invoice_pdf: 'url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET(new Request('http://localhost'), { params: { id: purchase._id.toString() } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('url')
    expect(mockRetrieve).toHaveBeenCalledWith('in_1', { stripeAccount: 'acct_1' })
  })

  it('allows seller to download invoice', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860fc') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860fd'),
      userId: new ObjectId('507f191e810c19729de860fe'),
      invoiceId: 'in_2',
      sellerId: 'acct_1',
    }
    mockRetrieve.mockResolvedValue({ invoice_pdf: 'url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET(new Request('http://localhost'), { params: { id: purchase._id.toString() } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('url')
    expect(mockRetrieve).toHaveBeenCalledWith('in_2', { stripeAccount: 'acct_1' })
  })
})
