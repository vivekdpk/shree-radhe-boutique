import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('customer list requests', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests only the current page and omits an empty gender filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [], total_count: 500, limit: 25, offset: 50 }),
    })
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', fetchMock)

    await api.customers('riya shah', '', 25, 50)

    const url = new URL(fetchMock.mock.calls[0][0] as string, 'http://localhost')
    expect(url.pathname).toBe('/api/v1/customers')
    expect(url.searchParams.get('search')).toBe('riya shah')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('offset')).toBe('50')
    expect(url.searchParams.has('gender')).toBe(false)
  })

  it('includes the selected gender filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [], total_count: 0, limit: 25, offset: 0 }),
    })
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', fetchMock)

    await api.customers('', 'female', 25, 0)

    const url = new URL(fetchMock.mock.calls[0][0] as string, 'http://localhost')
    expect(url.searchParams.get('gender')).toBe('female')
  })

  it('creates a payment against the order ledger with method and note', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, ok: true, json: async () => ({ id: 'p1' }) })
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', fetchMock)

    await api.createOrderPayment('order-1', { amount: 125.5, method: 'upi', note: 'Ref 42' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/orders/order-1/payments')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 125.5, method: 'upi', note: 'Ref 42' })
  })

  it('loads customer insights from the authenticated API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ summary: { customers: 500 } }) })
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', fetchMock)

    await api.customerInsights()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/customer-insights')
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
  })

  it('submits a public website enquiry without requiring an admin session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, ok: true, json: async () => ({ submitted: true }) })
    vi.stubGlobal('document', { cookie: '' })
    vi.stubGlobal('fetch', fetchMock)

    await api.submitInquiry({ name: 'Asha Rao', phone: '+91 98765 43210', email: 'asha@example.com', message: 'Fitting enquiry', website: '' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/public/inquiries')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
  })

  it('loads and updates website enquiries through admin API calls', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ items: [], total_count: 0, limit: 20, offset: 20 }) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ id: 'inquiry-1', status: 'read' }) })
    vi.stubGlobal('document', { cookie: 'srb_csrf=token' })
    vi.stubGlobal('fetch', fetchMock)

    await api.inquiries('new', 20, 20)
    await api.updateInquiry('inquiry-1', 'read')

    const url = new URL(fetchMock.mock.calls[0][0] as string, 'http://localhost')
    expect(url.pathname).toBe('/api/v1/inquiries')
    expect(url.searchParams.get('status')).toBe('new')
    expect(url.searchParams.get('offset')).toBe('20')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/inquiries/inquiry-1')
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH')
  })

  it('reads the public theme and saves an admin theme selection globally', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ theme: 'forest' }) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ theme: 'plum' }) })
    vi.stubGlobal('document', { cookie: 'srb_csrf=token' })
    vi.stubGlobal('fetch', fetchMock)

    await api.siteTheme()
    await api.updateSiteTheme('plum')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/public/theme')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/settings/theme')
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ theme: 'plum' })
    expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('token')
  })
})
