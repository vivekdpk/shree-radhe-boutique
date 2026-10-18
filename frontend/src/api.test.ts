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
})
