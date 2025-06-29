import { POST, PATCH } from '@/app/api/purchases/[id]/refund/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRefund = jest.fn()
const mockRetrieveInvoice = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    refunds: { create: mockRefund },
    invoices: { retrieve: mockRetrieveInvoice },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('refund routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('creates refund request as buyer', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860aa') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860ab'),
      userId: session.userId,
      sellerId: 'acct_1',
      paymentIntentId: 'pi_1',
      status: 'paid',
    }
    const updateOne = jest.fn()
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

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reason: 'bad' }) })
    const res = await POST(req, { params: { id: purchase._id.toString() } })
    expect(res.status).toBe(200)
    expect(updateOne).toHaveBeenCalledWith(
      { _id: purchase._id },
      {
        $set: {
          status: 'refund_requested',
          refundRequest: { status: 'requested', reason: 'bad' },
        },
      },
    )
  })

  it('approves refund as seller', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860ac') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860ad'),
      userId: new ObjectId('507f191e810c19729de860ae'),
      sellerId: 'acct_1',
      paymentIntentId: 'pi_1',
      status: 'paid',
      refundRequest: { status: 'requested', reason: 'bad' },
    }
    const updateOne = jest.fn()
    mockRefund.mockResolvedValue({ receipt_url: 'url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase), updateOne }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        return { findOne: jest.fn() }
      },
    })

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) })
    const res = await PATCH(req, { params: { id: purchase._id.toString() } })
    expect(res.status).toBe(200)
    expect(mockRefund).toHaveBeenCalled()
    expect(updateOne).toHaveBeenCalledWith(
      { _id: purchase._id },
      {
        $set: {
          status: 'refunded',
          'refundRequest.status': 'approved',
          refundReceiptUrl: 'url',
        },
      }
    )
  })

  it('refunds without request as seller', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de860af') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de860b0'),
      userId: new ObjectId('507f191e810c19729de860b1'),
      sellerId: 'acct_1',
      paymentIntentId: 'pi_1',
      status: 'paid',
    }
    const updateOne = jest.fn()
    mockRefund.mockResolvedValue({ receipt_url: 'url' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase), updateOne }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        return { findOne: jest.fn() }
      },
    })

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ action: 'refund' }) })
    const res = await PATCH(req, { params: { id: purchase._id.toString() } })
    expect(res.status).toBe(200)
    expect(mockRefund).toHaveBeenCalled()
    expect(updateOne).toHaveBeenCalledWith(
      { _id: purchase._id },
      {
        $set: {
          status: 'refunded',
          'refundRequest.status': 'approved',
          refundReceiptUrl: 'url',
        },
      }
    )
  })

  it('refunds using invoice when paymentIntent missing', async () => {
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86100') }
    const purchase = {
      _id: new ObjectId('507f191e810c19729de86101'),
      userId: new ObjectId('507f191e810c19729de86102'),
      sellerId: 'acct_1',
      invoiceId: 'in_1',
      status: 'paid',
    }
    const updateOne = jest.fn()
    mockRefund.mockResolvedValue({ receipt_url: 'url' })
    mockRetrieveInvoice.mockResolvedValue({ payment_intent: 'pi_sub' })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase), updateOne }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue({ _id: 'acct_1' }) }
        return { findOne: jest.fn() }
      },
    })

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ action: 'refund' }) })
    const res = await PATCH(req, { params: { id: purchase._id.toString() } })
    expect(res.status).toBe(200)
    expect(mockRetrieveInvoice).toHaveBeenCalledWith('in_1', { stripeAccount: 'acct_1' })
    expect(mockRefund).toHaveBeenCalledWith(
      { payment_intent: 'pi_sub' },
      { stripeAccount: 'acct_1' },
    )
    expect(updateOne).toHaveBeenCalledWith(
      { _id: purchase._id },
      {
        $set: {
          status: 'refunded',
          'refundRequest.status': 'approved',
          refundReceiptUrl: 'url',
        },
      },
    )
  })
})
