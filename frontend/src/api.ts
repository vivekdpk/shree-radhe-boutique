const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

function cookie(name: string): string | undefined {
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=').slice(1).join('=')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const csrf = cookie('srb_csrf')
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body.detail
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail ?? body))
  }
  return body as T
}

export type Customer = {
  id: string; customer_code: string; name: string; gender: 'female' | 'male'; city: string | null; phone: string | null
  alternate_phone: string | null; email: string | null; notes: string | null
  created_at: string; updated_at: string
}
export type CustomerPage = { items: Customer[]; total_count: number; limit: number; offset: number }
export type Field = { key: string; label: string; type: string; required: boolean; min?: number; max?: number; step?: number; group?: string }
export type Template = { id: string; template_key: string; name: string; category: string; current_version: number; current_version_id: string; fields: Field[] }
export type Profile = { id: string; customer_id: string; template_id: string; template_name: string; category: string; profile_name: string; created_at: string }
export type ProfileIndex = { id: string; customer_id: string; customer_name: string; customer_code: string; phone: string | null; template_name: string; category: string; profile_name: string; latest_version: number | null }
export type Measurement = {
  id: string; profile_id: string; version: number; template_version_id: string
  measured_at: string; unit: string; measurements: Record<string, number>
  fit_preference: string | null; notes: string | null; change_reason: string | null; created_at: string
}
export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
export type Order = {
  id: string; order_number: string; customer_id: string; customer_name: string; customer_phone: string | null
  measurement_record_id: string | null; garment_name: string; status: OrderStatus; order_date: string; due_date: string
  price: number; advance: number; balance: number; notes: string | null; created_at: string; updated_at: string
}

export const api = {
  me: () => request<{ authenticated: boolean }>('/auth/me'),
  login: (password: string) => request<{ authenticated: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST', body: '{}' }),
  customers: (search = '', gender = '', limit = 25, offset = 0) => {
    const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) })
    if (gender) params.set('gender', gender)
    return request<CustomerPage>(`/customers?${params.toString()}`)
  },
  customer: (id: string) => request<Customer>(`/customers/${id}`),
  createCustomer: (data: { name: string; gender: 'female' | 'male'; city?: string; phone?: string; alternate_phone?: string; email?: string; notes?: string }) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: { name?: string; gender?: 'female' | 'male'; city?: string | null; phone?: string | null; alternate_phone?: string | null; email?: string | null; notes?: string | null }) =>
    request<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveCustomer: (id: string) =>
    request<void>(`/customers/${id}/archive`, { method: 'POST', body: '{}' }),
  exportCustomer: (id: string) => request<Record<string, unknown>>(`/customers/${id}/export`),
  deleteCustomer: (id: string, confirmName: string) => request<void>(`/customers/${id}?confirm_name=${encodeURIComponent(confirmName)}`, { method: 'DELETE' }),
  templates: () => request<Template[]>('/garment-templates'),
  profiles: (customerId: string) => request<Profile[]>(`/customers/${customerId}/measurement-profiles`),
  measurementProfiles: () => request<ProfileIndex[]>('/measurement-profiles'),
  createProfile: (customerId: string, templateId: string, profileName: string) =>
    request<Profile>(`/customers/${customerId}/measurement-profiles`, {
      method: 'POST', body: JSON.stringify({ template_id: templateId, profile_name: profileName })
    }),
  measurements: (profileId: string) =>
    request<Measurement[]>(`/measurement-profiles/${profileId}/records`),
  createMeasurement: (profileId: string, data: Omit<Measurement, 'id' | 'profile_id' | 'version' | 'created_at'>) =>
    request<Measurement>(`/measurement-profiles/${profileId}/records`, { method: 'POST', body: JSON.stringify(data) }),
  orders: (status?: string) => request<Order[]>(`/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  customerOrders: (customerId: string) => request<Order[]>(`/customers/${customerId}/orders`),
  createOrder: (customerId: string, data: { garment_name: string; due_date: string; price: number; advance: number; notes?: string; measurement_record_id?: string | null }) =>
    request<Order>(`/customers/${customerId}/orders`, { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: { status?: OrderStatus; advance?: number; due_date?: string; notes?: string; garment_name?: string; price?: number }) =>
    request<Order>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}
