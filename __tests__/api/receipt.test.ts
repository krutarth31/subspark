import { GET } from '@/app/api/purchases/[id]/receipt/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRetrievePI = jest.fn()
const mockRetrieveInvoice = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { retrieve: mockRetrievePI },
    invoices: { retrieve: mockRetrieveInvoice },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('GET /api/purchases/[id]/receipt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('allows buyer to download receipt', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860fa') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860fb'),
      userId: session.userId,
      paymentIntentId: 'pi_1',
      sellerId: 'acct_1',
    }
    mockRetrievePI.mockResolvedValue({ charges: { data: [{ receipt_url: 'url' }] } })
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
    expect(mockRetrievePI).toHaveBeenCalledWith('pi_1', {
      stripeAccount: 'acct_1',
      expand: ['charges'],
    })
  })

  it('allows seller to download receipt', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860fc') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860fd'),
      userId: new ObjectId('507f191e810c19729de860fe'),
      paymentIntentId: 'pi_2',
      sellerId: 'acct_1',
    }
    mockRetrievePI.mockResolvedValue({ charges: { data: [{ receipt_url: 'url' }] } })
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
    expect(mockRetrievePI).toHaveBeenCalledWith('pi_2', {
      stripeAccount: 'acct_1',
      expand: ['charges'],
    })
  })

  it('falls back to invoice if payment intent missing', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860ff') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860ab'),
      userId: session.userId,
      invoiceId: 'in_1',
      sellerId: 'acct_1',
    }
    mockRetrieveInvoice.mockResolvedValue({ payment_intent: 'pi_3' })
    mockRetrievePI.mockResolvedValue({ charges: { data: [{ receipt_url: 'url' }] } })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase), updateOne: jest.fn() }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })

    const res = await GET(new Request('http://localhost'), { params: { id: purchase._id.toString() } })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.url).toBe('url')
    expect(mockRetrieveInvoice).toHaveBeenCalledWith('in_1', { stripeAccount: 'acct_1' })
    expect(mockRetrievePI).toHaveBeenCalledWith('pi_3', {
      stripeAccount: 'acct_1',
      expand: ['charges'],
    })
  })
})
