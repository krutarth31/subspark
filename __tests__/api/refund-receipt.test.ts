import { GET } from '@/app/api/purchases/[id]/refund-receipt/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRefundsList = jest.fn()
const mockRetrieveInvoice = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    refunds: { list: mockRefundsList },
    invoices: { retrieve: mockRetrieveInvoice },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/purchases/[id]/refund-receipt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('returns refund receipt for buyer', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86110') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86111'),
      userId: session.userId,
      paymentIntentId: 'pi_1',
      sellerId: 'acct_1',
    }
    mockRefundsList.mockResolvedValue({ data: [{ receipt_url: 'url' }] })
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
    expect(mockRefundsList).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', limit: 1 },
      { stripeAccount: 'acct_1' },
    )
  })

  it('falls back to invoice when payment intent missing', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86112') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86113'),
      userId: session.userId,
      invoiceId: 'in_1',
      sellerId: 'acct_1',
    }
    const updateOne = jest.fn()
    mockRefundsList.mockResolvedValue({ data: [{ receipt_url: 'url' }] })
    mockRetrieveInvoice.mockResolvedValue({ payment_intent: 'pi_sub' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase), updateOne }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET(new Request('http://localhost'), { params: { id: purchase._id.toString() } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('url')
    expect(mockRetrieveInvoice).toHaveBeenCalledWith('in_1', { stripeAccount: 'acct_1' })
    expect(mockRefundsList).toHaveBeenCalledWith(
      { payment_intent: 'pi_sub', limit: 1 },
      { stripeAccount: 'acct_1' },
    )
  })
})
