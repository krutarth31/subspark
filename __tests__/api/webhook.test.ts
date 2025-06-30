import { POST } from '@/app/api/stripe/webhook/route'
import { getDb } from '@/lib/mongo'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockConstruct = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstruct },
  }))
})

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec'
  })

  it('updates purchase on subscription cancel', async () => {
    const updateOne = jest.fn()
    mockConstruct.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    })
    mockGetDb.mockResolvedValue({
      collection: () => ({ updateOne }),
    })

    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: 'payload',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(updateOne).toHaveBeenCalledWith(
      { subscriptionId: 'sub_1' },
      { $set: { status: 'canceled' } },
    )
  })
})
