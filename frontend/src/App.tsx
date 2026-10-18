import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Ruler, Users, LogOut, ArrowLeft, Plus, History, Check, Shirt, AlertCircle, Pencil, Archive, X, CalendarDays, ClipboardList, Download, Printer, Trash2, Clock3, Home, Menu, BarChart3, ChevronRight } from 'lucide-react'
import { api, Customer, Template, Profile, Measurement, Field, Order, OrderStatus, ProfileIndex } from './api'
import { convertMeasurementValues, validateMeasurementValues } from './measurementValidation'

type View = 'home' | 'customers' | 'customer' | 'measure' | 'history' | 'orders' | 'measurements' | 'reports'
const CUSTOMER_PAGE_SIZE = 25
const LIST_PAGE_SIZE = 20
const HISTORY_PAGE_SIZE = 10

function ListPagination({ label, page, pageSize, total, onPage }: { label: string; page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return <nav className="pagination list-pagination" aria-label={`${label} pages`}>
    <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
    <div>
      <button className="secondary" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</button>
      <span className="page-number">Page {page + 1} of {pages}</span>
      <button className="secondary" onClick={() => onPage(Math.min(pages - 1, page + 1))} disabled={page + 1 >= pages}>Next</button>
    </div>
  </nav>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [view, setView] = useState<View>('home')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<'' | 'female' | 'male'>('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerTotal, setCustomerTotal] = useState(0)
  const [allCustomerCount, setAllCustomerCount] = useState(0)
  const [customerPage, setCustomerPage] = useState(0)
  const [customerOrdersPage, setCustomerOrdersPage] = useState(0)
  const [profilePage, setProfilePage] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [ordersPage, setOrdersPage] = useState(0)
  const [measurementPage, setMeasurementPage] = useState(0)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<Measurement[]>([])
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [measurementProfiles, setMeasurementProfiles] = useState<ProfileIndex[]>([])
  const [measurementQuery, setMeasurementQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null)
  const [orderGarment, setOrderGarment] = useState('')
  const [orderDueDate, setOrderDueDate] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderAdvance, setOrderAdvance] = useState('0')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderMeasurementId, setOrderMeasurementId] = useState('')
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [remindersEnabled, setRemindersEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const [reminderPulse, setReminderPulse] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [profileName, setProfileName] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAltPhone, setNewAltPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newGender, setNewGender] = useState<'female' | 'male'>('female')
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAltPhone, setEditAltPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editGender, setEditGender] = useState<'female' | 'male'>('female')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches')
  const [fit, setFit] = useState('regular')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { api.me().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false)) }, [])
  useEffect(() => {
    if (!authenticated) return
    let current = true
    api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE)
      .then(r => {
        if (!current) return
        setCustomers(r.items ?? [])
        setCustomerTotal(r.total_count)
      })
      .catch(e => { if (current) setError(e.message) })
    return () => { current = false }
  }, [authenticated, search, genderFilter, customerPage])
  useEffect(() => {
    if (authenticated) api.templates().then(setTemplates).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.customers('', '', 1, 0).then(result => setAllCustomerCount(result.total_count)).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.orders().then(setAllOrders).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.measurementProfiles().then(setMeasurementProfiles).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (!remindersEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = Date.now()
    for (const order of allOrders) {
      if (['delivered','cancelled'].includes(order.status)) continue
      const due = new Date(order.due_date).getTime()
      if (due > now + 24 * 60 * 60 * 1000 || order.balance <= 0) continue
      const key = `srb-reminder-${order.id}-${new Date(order.due_date).toISOString().slice(0, 10)}`
      if (localStorage.getItem(key)) continue
      new Notification('Shree Radhe Boutique', { body: `${order.customer_name}: ${order.garment_name} is due ${due < now ? 'overdue' : 'within 24 hours'}; balance ₹${order.balance.toFixed(2)}.` })
      localStorage.setItem(key, 'sent')
    }
  }, [remindersEnabled, allOrders, reminderPulse])
  useEffect(() => {
    if (!remindersEnabled) return
    const timer = window.setInterval(() => setReminderPulse(pulse => pulse + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [remindersEnabled])
  useEffect(() => {
    if (!printingOrder) return
    const timer = window.setTimeout(() => { window.print(); setPrintingOrder(null) }, 120)
    return () => window.clearTimeout(timer)
  }, [printingOrder])

  const latestByProfile = useMemo(() => {
    const map = new Map<string, Measurement>()
    history.forEach(m => { if (!map.has(m.profile_id) || map.get(m.profile_id)!.version < m.version) map.set(m.profile_id, m) })
    return map
  }, [history])
  const visibleOrders = useMemo(() => {
    const term = orderQuery.trim().toLocaleLowerCase()
    return allOrders.filter(order => (!orderStatusFilter || order.status === orderStatusFilter) && (!term || [order.order_number, order.customer_name, order.customer_phone ?? '', order.garment_name].some(value => value.toLocaleLowerCase().includes(term))))
  }, [allOrders, orderQuery, orderStatusFilter])
  const pagedOrders = useMemo(() => visibleOrders.slice(ordersPage * LIST_PAGE_SIZE, (ordersPage + 1) * LIST_PAGE_SIZE), [visibleOrders, ordersPage])
  const visibleMeasurementProfiles = useMemo(() => {
    const term = measurementQuery.trim().toLocaleLowerCase()
    return measurementProfiles.filter(profile => !term || [profile.customer_name, profile.customer_code, profile.phone ?? '', profile.profile_name, profile.template_name].some(value => value.toLocaleLowerCase().includes(term)))
  }, [measurementProfiles, measurementQuery])
  const pagedMeasurementProfiles = useMemo(() => visibleMeasurementProfiles.slice(measurementPage * LIST_PAGE_SIZE, (measurementPage + 1) * LIST_PAGE_SIZE), [visibleMeasurementProfiles, measurementPage])
  const selectedHistory = useMemo(() => history.filter(m => m.profile_id === selectedProfile?.id), [history, selectedProfile])
  const pagedHistory = useMemo(() => selectedHistory.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE), [selectedHistory, historyPage])
  const pagedCustomerOrders = useMemo(() => customerOrders.slice(customerOrdersPage * LIST_PAGE_SIZE, (customerOrdersPage + 1) * LIST_PAGE_SIZE), [customerOrders, customerOrdersPage])
  const pagedProfiles = useMemo(() => profiles.slice(profilePage * LIST_PAGE_SIZE, (profilePage + 1) * LIST_PAGE_SIZE), [profiles, profilePage])
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const openOrders = allOrders.filter(order => !['delivered', 'cancelled'].includes(order.status))
  const overdueOrders = openOrders.filter(order => new Date(order.due_date).setHours(0, 0, 0, 0) < todayStart.getTime())

  useEffect(() => { setOrdersPage(page => Math.min(page, Math.max(0, Math.ceil(visibleOrders.length / LIST_PAGE_SIZE) - 1))) }, [visibleOrders.length])
  useEffect(() => { setMeasurementPage(page => Math.min(page, Math.max(0, Math.ceil(visibleMeasurementProfiles.length / LIST_PAGE_SIZE) - 1))) }, [visibleMeasurementProfiles.length])
  useEffect(() => { setCustomerOrdersPage(page => Math.min(page, Math.max(0, Math.ceil(customerOrders.length / LIST_PAGE_SIZE) - 1))) }, [customerOrders.length])
  useEffect(() => { setProfilePage(page => Math.min(page, Math.max(0, Math.ceil(profiles.length / LIST_PAGE_SIZE) - 1))) }, [profiles.length])
  useEffect(() => { setHistoryPage(page => Math.min(page, Math.max(0, Math.ceil(selectedHistory.length / HISTORY_PAGE_SIZE) - 1))) }, [selectedHistory.length])

  function navigate(next: View) {
    setView(next)
    setSelectedCustomer(null)
    setMobileNavOpen(false)
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setLoginError('')
    try { await api.login(password); setAuthenticated(true); setPassword('') }
    catch { setLoginError('Login failed. Check the owner password and try again.') }
    finally { setBusy(false) }
  }

  async function openCustomer(customer: Customer) {
    setCustomerOrdersPage(0); setProfilePage(0); setHistoryPage(0)
    setError(''); setSuccess(''); setSelectedCustomer(customer); setEditingCustomer(false); setView('customer'); setMobileNavOpen(false)
    try {
      const p = await api.profiles(customer.id)
      setProfiles(p)
      const records = await Promise.all(p.map(x => api.measurements(x.id).catch(() => [])))
      setHistory(records.flat().sort((a, b) => b.version - a.version))
      setCustomerOrders(await api.customerOrders(customer.id))
    } catch (e) { setError((e as Error).message) }
  }

  async function openMeasurementHistory(item: ProfileIndex) {
    try {
      setHistoryPage(0)
      const customer = await api.customer(item.customer_id)
      const [customerProfiles, records] = await Promise.all([api.profiles(item.customer_id), api.measurements(item.id)])
      setSelectedCustomer(customer)
      setProfiles(customerProfiles)
      setSelectedProfile(customerProfiles.find(profile => profile.id === item.id) ?? null)
      setHistory(records)
      setView('history')
      setMobileNavOpen(false)
    } catch (e) { setError((e as Error).message) }
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const possibleMatches = await api.customers(newName.trim(), '', 10, 0)
      const nameKey = newName.trim().toLocaleLowerCase()
      const phoneKey = newPhone.replace(/\D/g, '')
      const exactMatches = possibleMatches.items.filter(c => c.name.trim().toLocaleLowerCase() === nameKey || (phoneKey.length >= 7 && (c.phone ?? '').replace(/\D/g, '') === phoneKey))
      if (exactMatches.length && !window.confirm(`Possible existing customer: ${exactMatches.map(c => `${c.name} (${c.customer_code})`).join(', ')}. Add another record anyway?`)) return
      const customer = await api.createCustomer({ name: newName, gender: newGender, phone: newPhone || undefined, alternate_phone: newAltPhone || undefined, email: newEmail || undefined, notes: newCustomerNotes || undefined })
      setNewName(''); setNewPhone(''); setNewAltPhone(''); setNewEmail(''); setNewCustomerNotes(''); setNewGender('female'); setShowAddCustomer(false)
      setCustomerPage(0)
      const result = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, 0)
      setCustomers(result.items); setCustomerTotal(result.total_count)
      api.customers('', '', 1, 0).then(all => setAllCustomerCount(all.total_count)).catch(() => {})
      await openCustomer(customer)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function refreshCustomers() {
    const r = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE)
    setCustomers(r.items); setCustomerTotal(r.total_count)
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || !orderGarment.trim() || !orderDueDate) return
    setBusy(true); setError('')
    try {
      const order = await api.createOrder(selectedCustomer.id, {
        garment_name: orderGarment.trim(), due_date: new Date(`${orderDueDate}T23:59:00`).toISOString(),
        price: Number(orderPrice), advance: Number(orderAdvance), notes: orderNotes.trim() || undefined,
        measurement_record_id: orderMeasurementId || null,
      })
      setCustomerOrders(rows => [order, ...rows]); setCustomerOrdersPage(0); setAllOrders(rows => [order, ...rows]); setOrdersPage(0)
      setOrderGarment(''); setOrderDueDate(''); setOrderPrice(''); setOrderAdvance('0'); setOrderNotes(''); setOrderMeasurementId('')
      setSuccess(`Order ${order.order_number} created.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function changeOrderStatus(order: Order, status: OrderStatus) {
    try {
      const updated = await api.updateOrder(order.id, { status })
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
    } catch (e) { setError((e as Error).message) }
  }

  function openPaymentForm(order: Order) {
    setPaymentOrder(order)
    setPaymentAmount('')
    setError('')
  }

  async function addOrderPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentOrder) return
    const amount = Number(paymentAmount)
    const amountCents = Math.round(amount * 100)
    const balanceCents = Math.round(paymentOrder.balance * 100)
    if (!Number.isFinite(amount) || amountCents <= 0 || amountCents > balanceCents) {
      setError(`Enter an amount from ₹0.01 to ₹${paymentOrder.balance.toFixed(2)}.`)
      return
    }
    setBusy(true)
    try {
      const order = paymentOrder
      const updated = await api.updateOrder(order.id, { advance: Math.round((order.advance * 100 + amountCents)) / 100 })
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setPaymentOrder(null); setPaymentAmount(''); setError('')
      setSuccess(`Payment of ₹${(amountCents / 100).toFixed(2)} recorded for ${order.order_number}.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function editOrder(order: Order) {
    const garment = window.prompt('Garment / work description:', order.garment_name)
    if (garment === null) return
    const dueDate = window.prompt('Delivery date (YYYY-MM-DD):', new Date(order.due_date).toISOString().slice(0, 10))
    if (dueDate === null) return
    const priceText = window.prompt('Total price:', String(order.price))
    if (priceText === null) return
    const notesValue = window.prompt('Design / order notes:', order.notes ?? '')
    if (notesValue === null) return
    const price = Number(priceText)
    if (!garment.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(price) || price < order.advance) {
      setError('Check the garment name, delivery date and price. Total price must be at least the advance already received.')
      return
    }
    try {
      const updated = await api.updateOrder(order.id, { garment_name: garment.trim(), due_date: new Date(`${dueDate}T23:59:00`).toISOString(), price, notes: notesValue.trim() })
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setSuccess(`Order ${order.order_number} updated.`)
    } catch (e) { setError((e as Error).message) }
  }

  async function exportCustomer() {
    if (!selectedCustomer) return
    try {
      const data = await api.exportCustomer(selectedCustomer.id)
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `${selectedCustomer.customer_code}-records.json`; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
  }

  async function permanentlyDeleteCustomer() {
    if (!selectedCustomer) return
    const confirmation = window.prompt(`This permanently deletes ${selectedCustomer.name}, all measurement history, and all orders. Export first if you need a copy. Type the customer's full name to confirm.`)
    if (confirmation !== selectedCustomer.name) { if (confirmation !== null) setError('Name did not match. Nothing was deleted.'); return }
    setBusy(true)
    try {
      await api.deleteCustomer(selectedCustomer.id, confirmation)
      setSelectedCustomer(null); setView('customers'); await refreshCustomers()
      const [orders, profiles, count] = await Promise.all([api.orders(), api.measurementProfiles(), api.customers('', '', 1, 0)])
      setAllOrders(orders); setMeasurementProfiles(profiles); setAllCustomerCount(count.total_count); setSuccess('Customer and linked records permanently deleted.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  function printCurrent() { window.print() }

  async function enableReminders() {
    if (!('Notification' in window)) { setError('This browser does not support notifications. Upcoming orders remain visible in the app.'); return }
    const permission = await Notification.requestPermission()
    setRemindersEnabled(permission === 'granted')
    if (permission === 'granted') {
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const due = allOrders.filter(o => !['delivered','cancelled'].includes(o.status) && new Date(o.due_date) <= today && o.balance > 0)
      if (!due.length) new Notification('Shree Radhe Boutique', { body: 'Reminders are enabled while this app is open. Upcoming work is shown on the home screen.' })
    }
  }

  function exportOrdersCsv() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [['Order','Customer','Garment','Due date','Status','Price','Advance','Balance'], ...allOrders.map(o => [o.order_number,o.customer_name,o.garment_name,new Date(o.due_date).toLocaleDateString(),o.status,o.price,o.advance,o.balance])]
    const csv = rows.map(row => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'shree-radhe-orders.csv'; link.click(); URL.revokeObjectURL(url)
  }

  async function exportCustomersCsv() {
    try {
      const first = await api.customers('', '', 500, 0)
      const rows = [...first.items]
      for (let offset = first.items.length; offset < first.total_count; offset += 500) {
        rows.push(...(await api.customers('', '', 500, offset)).items)
      }
      const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
      const csv = [['Customer code','Name','Gender','Phone','Alternate phone','Email','Notes'], ...rows.map(c => [c.customer_code,c.name,c.gender,c.phone,c.alternate_phone,c.email,c.notes])].map(row => row.map(quote).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'shree-radhe-customers.csv'; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
  }

  function beginCustomerEdit() {
    if (!selectedCustomer) return
    setEditName(selectedCustomer.name)
    setEditPhone(selectedCustomer.phone ?? '')
    setEditAltPhone(selectedCustomer.alternate_phone ?? '')
    setEditEmail(selectedCustomer.email ?? '')
    setEditNotes(selectedCustomer.notes ?? '')
    setEditGender(selectedCustomer.gender)
    setEditingCustomer(true)
  }

  async function saveCustomerEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer) return
    setBusy(true); setError('')
    try {
      const updated = await api.updateCustomer(selectedCustomer.id, {
        name: editName.trim(), gender: editGender, phone: editPhone.trim() || null,
        alternate_phone: editAltPhone.trim() || null, email: editEmail.trim() || null, notes: editNotes.trim() || null,
      })
      setSelectedCustomer(updated)
      setEditingCustomer(false)
      await refreshCustomers()
      setSuccess('Customer details updated.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function archiveSelectedCustomer() {
    if (!selectedCustomer || !window.confirm(`Archive ${selectedCustomer.name}? Their measurement history will be retained but the customer will leave the active list.`)) return
    setBusy(true); setError('')
    try {
      await api.archiveCustomer(selectedCustomer.id)
      setSelectedCustomer(null); setView('customers')
      const nextPage = Math.min(customerPage, Math.max(0, Math.ceil((customerTotal - 1) / CUSTOMER_PAGE_SIZE) - 1))
      setCustomerPage(nextPage)
      const result = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, nextPage * CUSTOMER_PAGE_SIZE)
      setCustomers(result.items); setCustomerTotal(result.total_count)
      const [all, profiles] = await Promise.all([api.customers('', '', 1, 0), api.measurementProfiles()])
      setAllCustomerCount(all.total_count); setMeasurementProfiles(profiles)
      setSuccess('Customer archived. Historical records have been retained.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function createProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || !selectedTemplate) return
    setBusy(true); setError('')
    try {
      const p = await api.createProfile(selectedCustomer.id, selectedTemplate.id, profileName || selectedTemplate.name)
      setProfiles(old => [p, ...old]); setProfilePage(0); setSelectedProfile(p); setProfileName('')
      api.measurementProfiles().then(setMeasurementProfiles).catch(() => {})
      setFormValues({}); setNotes(''); setView('measure')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function startNewVersion(profile: Profile) {
    setSelectedProfile(profile); setError(''); setSuccess('')
    const template = templates.find(t => t.id === profile.template_id)
    if (!template) { setError('Template not found'); return }
    setSelectedTemplate(template)
    const records = await api.measurements(profile.id).catch(() => [])
    const latest = records[0]
    setFormValues(latest ? Object.fromEntries(Object.entries(latest.measurements).map(([k,v]) => [k, String(v)])) : {})
    setUnit((latest?.unit as 'inches' | 'cm') ?? 'inches')
    setFit(latest?.fit_preference ?? 'regular'); setNotes('')
    setView('measure')
  }

  function changeUnit(nextUnit: 'inches' | 'cm') {
    setFormValues(current => convertMeasurementValues(current, unit, nextUnit))
    setUnit(nextUnit)
  }

  async function saveMeasurement(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProfile || !selectedTemplate) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const validationMessage = validateMeasurementValues(selectedTemplate.fields, formValues)
      if (validationMessage) throw new Error(validationMessage)
      const measurements = Object.fromEntries(
        Object.entries(formValues).filter(([,v]) => v.trim() !== '').map(([k,v]) => [k, Number(v)])
      )
      if (Object.values(measurements).some(v => !Number.isFinite(v) || v <= 0)) {
        throw new Error('Measurements must be positive numbers.')
      }
      const saved = await api.createMeasurement(selectedProfile.id, {
        template_version_id: selectedTemplate.current_version_id,
        measured_at: new Date().toISOString(),
        unit, measurements, fit_preference: fit, notes, change_reason: 'New measurement entry'
      })
      await openCustomer(selectedCustomer!)
      api.measurementProfiles().then(setMeasurementProfiles).catch(() => {})
      setSuccess(`Measurement version ${saved.version} saved.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  if (authenticated === null) return <main className="center"><div className="panel">Loading Shree Radhe Boutique…</div></main>
  if (!authenticated) return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={doLogin}>
        <div className="brand-mark"><Ruler size={24}/></div>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Shree Radhe Boutique</h1>
        <p className="muted">Your digital measurement book</p>
        <label>Owner password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {loginError && <p className="error"><AlertCircle size={16}/>{loginError}</p>}
        <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu-button" aria-label="Open navigation menu" onClick={() => setMobileNavOpen(true)}><Menu size={21}/></button>
        <div className="topbar-title">{view === 'home' ? 'Dashboard' : view === 'customers' ? 'Customers' : view === 'orders' ? 'Orders' : view === 'measurements' ? 'Measurements' : view === 'reports' ? 'Reports' : selectedCustomer?.name ?? 'Customer record'}</div>
        <button className="icon-button" title="Log out" onClick={async () => { await api.logout().catch(() => {}); setAuthenticated(false) }}><LogOut size={18}/></button>
      </header>
      <div className="app-frame">
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)}/>}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-brand" onClick={() => navigate('home')}><span className="brand-mark"><Ruler size={23}/></span><span><b>Shree Radhe</b><small>BOUTIQUE</small></span></button>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}><Home size={18}/>Dashboard</button>
          <button className={`nav-item ${view === 'customers' || view === 'customer' ? 'active' : ''}`} onClick={() => navigate('customers')}><Users size={18}/>Customers</button>
          <button className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => navigate('orders')}><ClipboardList size={18}/>Orders<span className="nav-count">{allOrders.filter(order => !['delivered','cancelled'].includes(order.status)).length}</span></button>
          <button className={`nav-item ${view === 'measurements' || view === 'measure' || view === 'history' ? 'active' : ''}`} onClick={() => navigate('measurements')}><Ruler size={18}/>Measurements</button>
          <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => navigate('reports')}><BarChart3 size={18}/>Reports</button>
        </nav>
        <div className="sidebar-footer"><span className="sidebar-status-dot"/>Private workspace<small>Customer records stay under your control</small></div>
      </aside>
      <main className="content">
        {error && <div className="alert error"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
        {success && <div className="alert success"><Check size={17}/>{success}</div>}

        {view === 'home' && <>
          <section className="dashboard-welcome">
            <div><p className="eyebrow">YOUR SHOP</p><h1>Good morning</h1></div>
            <div className="dashboard-actions"><button className="secondary" onClick={() => { setView('customers'); setShowAddCustomer(true) }}><UserPlus size={16}/> Add customer</button><button className="primary" onClick={() => { setView('customers'); setSuccess('Choose a customer to start a new order.') }}><Plus size={16}/> New order</button></div>
          </section>
          <section className="dashboard-stats">
            <div className="stat-card"><span className="stat-icon stat-green"><ClipboardList size={18}/></span><b>{openOrders.length}</b><small>Open orders</small></div>
            <div className="stat-card"><span className="stat-icon stat-gold"><CalendarDays size={18}/></span><b>{allOrders.filter(o => new Date(o.due_date).toDateString() === new Date().toDateString() && !['delivered','cancelled'].includes(o.status)).length}</b><small>Due today</small></div>
            <div className="stat-card"><span className="stat-icon stat-red"><AlertCircle size={18}/></span><b>{overdueOrders.length}</b><small>Overdue</small></div>
            <div className="stat-card"><span className="stat-icon stat-green"><span className="rupee-mark">₹</span></span><b>₹{allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.balance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Balance due</small></div>
          </section>
          {!remindersEnabled && 'Notification' in window && <button className="secondary reminder-button" onClick={enableReminders}>Enable reminders while app is open</button>}
          <div className="dashboard-panels">
            <section className="panel dashboard-panel">
              <div className="section-head"><div><h2>Upcoming deliveries</h2></div><button className="text-link" onClick={() => navigate('orders')}>View all <ChevronRight size={15}/></button></div>
              <div className="dashboard-table-head"><span>Order</span><span>Customer</span><span>Due</span><span>Status</span></div>
              {openOrders.slice(0, 5).map(order => <div className="dashboard-order-row" key={order.id}>
                <b>{order.order_number}</b><span className="dashboard-customer-cell"><span>{order.customer_name}</span><small>{order.garment_name}</small></span><span>{new Date(order.due_date).toLocaleDateString()}</span><span className={`status-pill status-${order.status}`}>{order.status.replace('_',' ')}</span>
              </div>)}
              {!openOrders.length && <div className="empty"><Clock3 size={22}/><b>No open orders</b><span>New tailoring orders will appear here.</span></div>}
            </section>
            <section className="panel dashboard-panel">
              <div className="section-head"><div><h2>Unpaid balances</h2></div><button className="text-link" onClick={() => navigate('orders')}>View all <ChevronRight size={15}/></button></div>
              {allOrders.filter(o => o.balance > 0 && o.status !== 'cancelled').slice(0, 5).map(order => <div className="balance-row" key={order.id}>
                <span className="balance-avatar">{order.customer_name.slice(0,1).toUpperCase()}</span><span className="balance-customer"><b>{order.customer_name}</b><small>{order.order_number} · {order.garment_name}</small></span><b className="balance-value">₹{order.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
                <button className="payment-quick" aria-label={`Add payment to ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={16}/></button>
              </div>)}
              {!allOrders.some(o => o.balance > 0 && o.status !== 'cancelled') && <div className="empty"><Check size={22}/><b>No outstanding balances</b></div>}
            </section>
          </div>
          <section className="dashboard-footnote"><Users size={17}/><span><b>{allCustomerCount.toLocaleString('en-IN')} customers</b></span><button className="text-link" onClick={() => navigate('customers')}>Customer book <ChevronRight size={15}/></button></section>
        </>}

        {view === 'customers' && <>
          <section className="panel">
            <div className="customer-toolbar">
              <div><p className="eyebrow">CUSTOMER BOOK</p><h1>Customers</h1><p className="muted">{customerTotal} saved · {templates.length} garment templates</p></div>
              <button className="primary add-customer-toggle" onClick={() => setShowAddCustomer(value => !value)}>
                {showAddCustomer ? <X size={17}/> : <UserPlus size={17}/>} {showAddCustomer ? 'Close' : 'Add customer'}
              </button>
            </div>
            {showAddCustomer && <form className="customer-add-form" onSubmit={addCustomer}>
              <div className="form-grid">
                <label>Customer name<input value={newName} onChange={e => setNewName(e.target.value)} required maxLength={150} placeholder="e.g. Rahul Sharma" autoFocus/></label>
                <label>Gender<select value={newGender} onChange={e => setNewGender(e.target.value as 'female' | 'male')}><option value="female">Female</option><option value="male">Male</option></select></label>
                <label>Mobile number <span className="muted">(optional)</span><input value={newPhone} onChange={e => setNewPhone(e.target.value)} maxLength={20} placeholder="+91…"/></label>
                <label>Alternate phone <span className="muted">(optional)</span><input value={newAltPhone} onChange={e => setNewAltPhone(e.target.value)} maxLength={20}/></label>
                <label>Email <span className="muted">(optional)</span><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} maxLength={254}/></label>
                <label>Customer notes <span className="muted">(optional)</span><input value={newCustomerNotes} onChange={e => setNewCustomerNotes(e.target.value)} maxLength={2000} placeholder="Preferences or useful details"/></label>
              </div>
              <div className="form-actions"><button type="button" className="secondary" onClick={() => setShowAddCustomer(false)}>Cancel</button><button className="primary" disabled={busy}><Plus size={17}/>{busy ? 'Saving…' : 'Save customer'}</button></div>
            </form>}
            <div className="customer-filters">
              <div className="searchbox"><Search size={18}/><input value={search} onChange={e => { setSearch(e.target.value); setCustomerPage(0) }} placeholder="Search by name, phone, or code" /></div>
              <label className="gender-filter">Gender<select value={genderFilter} onChange={e => { setGenderFilter(e.target.value as '' | 'female' | 'male'); setCustomerPage(0) }}><option value="">All genders</option><option value="female">Female</option><option value="male">Male</option></select></label>
            </div>
            <div className="customer-list">
              {customers.map(c => <button className="customer-row" key={c.id} onClick={() => openCustomer(c)}>
                <span className="avatar">{c.name.slice(0,1).toUpperCase()}</span>
                <span className="customer-main"><b>{c.name}</b><small>{c.phone || c.customer_code} · {c.gender === 'female' ? 'Female' : 'Male'}</small></span>
                <span className="customer-code">{c.customer_code}</span>
              </button>)}
              {!customers.length && <div className="empty"><Users size={25}/><b>No customers found</b><span>Add your first customer below.</span></div>}
            </div>
            {customerTotal > CUSTOMER_PAGE_SIZE && <nav className="pagination" aria-label="Customer pages">
              <span>Showing {customerPage * CUSTOMER_PAGE_SIZE + 1}–{Math.min((customerPage + 1) * CUSTOMER_PAGE_SIZE, customerTotal)} of {customerTotal}</span>
              <div>
                <button className="secondary" onClick={() => setCustomerPage(page => Math.max(0, page - 1))} disabled={customerPage === 0}>Previous</button>
                <span className="page-number">Page {customerPage + 1} of {Math.ceil(customerTotal / CUSTOMER_PAGE_SIZE)}</span>
                <button className="secondary" onClick={() => setCustomerPage(page => Math.min(Math.ceil(customerTotal / CUSTOMER_PAGE_SIZE) - 1, page + 1))} disabled={(customerPage + 1) * CUSTOMER_PAGE_SIZE >= customerTotal}>Next</button>
              </div>
            </nav>}
          </section>
        </>}

        {view === 'customer' && selectedCustomer && <>
          <button className="back-button" onClick={() => setView('customers')}><ArrowLeft size={16}/> Customers</button>
          <section className="hero compact">
            <p className="eyebrow">{selectedCustomer.customer_code}</p>
            <h1>{selectedCustomer.name}</h1><p className="muted">{selectedCustomer.gender === 'female' ? 'Female' : 'Male'} · {selectedCustomer.phone || 'No phone added'}</p>
            <div className="customer-actions">
              <button className="secondary" title="Edit customer" aria-label="Edit customer" onClick={beginCustomerEdit}><Pencil size={15}/><span className="action-label">Edit customer</span></button>
              <button className="secondary" title="Export records" aria-label="Export records" onClick={exportCustomer}><Download size={15}/><span className="action-label">Export records</span></button>
              <button className="secondary" title="Print profile" aria-label="Print profile" onClick={printCurrent}><Printer size={15}/><span className="action-label">Print profile</span></button>
              <button className="secondary danger-button" title="Archive customer" aria-label="Archive customer" onClick={archiveSelectedCustomer} disabled={busy}><Archive size={15}/><span className="action-label">Archive</span></button>
              <button className="secondary danger-button" title="Delete customer permanently" aria-label="Delete customer permanently" onClick={permanentlyDeleteCustomer} disabled={busy}><Trash2 size={15}/><span className="action-label">Delete permanently</span></button>
            </div>
          </section>
          {(selectedCustomer.notes || selectedCustomer.email || selectedCustomer.alternate_phone) && <section className="panel customer-contact"><h2>Contact & notes</h2>{selectedCustomer.alternate_phone && <p>Alternate phone: {selectedCustomer.alternate_phone}</p>}{selectedCustomer.email && <p>Email: {selectedCustomer.email}</p>}{selectedCustomer.notes && <p className="notes">{selectedCustomer.notes}</p>}</section>}
          {editingCustomer && <section className="panel">
            <div className="section-head"><div><h2>Edit customer</h2><p className="muted">Customer code stays the same.</p></div><button className="icon-button" type="button" title="Cancel editing" onClick={() => setEditingCustomer(false)}><X size={17}/></button></div>
            <form className="form-grid" onSubmit={saveCustomerEdit}>
              <label>Customer name<input value={editName} onChange={e => setEditName(e.target.value)} required maxLength={150}/></label>
              <label>Gender<select value={editGender} onChange={e => setEditGender(e.target.value as 'female' | 'male')}><option value="female">Female</option><option value="male">Male</option></select></label>
              <label>Mobile number<input value={editPhone} onChange={e => setEditPhone(e.target.value)} maxLength={20} placeholder="+91…"/></label>
              <label>Alternate phone<input value={editAltPhone} onChange={e => setEditAltPhone(e.target.value)} maxLength={20}/></label>
              <label>Email<input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} maxLength={254}/></label>
              <label>Customer notes<textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}/></label>
              <button className="primary" disabled={busy}><Check size={16}/>{busy ? 'Saving…' : 'Save changes'}</button>
            </form>
          </section>}
          <section className="panel">
            <div className="section-head"><div><h2>Measurement profiles</h2><p className="muted">Separate profiles for different fits or occasions.</p></div><Ruler size={20}/></div>
            {pagedProfiles.map(p => <div className="profile-row" key={p.id}>
              <div className="profile-icon"><Shirt size={18}/></div>
              <div className="profile-main"><b>{p.profile_name}</b><small>{p.template_name} · {p.category}</small><small>{latestByProfile.get(p.id) ? `Latest version: v${latestByProfile.get(p.id)!.version}` : 'No measurements saved yet'}</small></div>
              <button className="secondary" onClick={() => startNewVersion(p)}><Ruler size={15}/> Measure</button>
              <button className="icon-button" title="View history" onClick={async () => { setHistoryPage(0); setSelectedProfile(p); setHistory(await api.measurements(p.id)); setView('history') }}><History size={17}/></button>
            </div>)}
            <ListPagination label="Measurement profile" page={profilePage} pageSize={LIST_PAGE_SIZE} total={profiles.length} onPage={setProfilePage}/>
            {!profiles.length && <div className="empty"><Ruler size={24}/><b>No measurement profiles</b><span>Create a garment profile to begin.</span></div>}
          </section>
          <section className="panel">
            <div className="section-head"><div><h2>Orders & delivery</h2><p className="muted">Track garment work, due dates, advances and balances.</p></div><ClipboardList size={20}/></div>
            <form className="order-form" onSubmit={createOrder}>
              <div className="form-grid">
                <label>Garment / work<input value={orderGarment} onChange={e => setOrderGarment(e.target.value)} required maxLength={120} placeholder="e.g. Bridal blouse"/></label>
                <label>Delivery date<input type="date" value={orderDueDate} onChange={e => setOrderDueDate(e.target.value)} required/></label>
                <label>Total price<input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} required/></label>
                <label>Advance paid<input type="number" min="0" max={orderPrice || undefined} step="0.01" value={orderAdvance} onChange={e => setOrderAdvance(e.target.value)} required/></label>
                <label>Measurement version<select value={orderMeasurementId} onChange={e => setOrderMeasurementId(e.target.value)}><option value="">No linked version</option>{history.map(m => <option value={m.id} key={m.id}>{profiles.find(p => p.id === m.profile_id)?.profile_name ?? 'Profile'} · v{m.version} · {new Date(m.measured_at).toLocaleDateString()}</option>)}</select></label>
                <label>Design / order notes<input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} maxLength={2000} placeholder="Fabric, style, special instructions"/></label>
              </div>
              <div className="form-actions"><button className="primary" disabled={busy}><Plus size={16}/>{busy ? 'Creating…' : 'Create order'}</button></div>
            </form>
            <div className="orders-list">
              {pagedCustomerOrders.map(order => <article className="order-card" key={order.id}>
                <div className="order-row"><div className="order-main"><b>{order.garment_name} <span className="muted">· {order.order_number}</span></b><small>Due {new Date(order.due_date).toLocaleDateString()} · Total ₹{order.price.toFixed(2)} · Balance ₹{order.balance.toFixed(2)}</small></div>
                  <div className="order-controls">
                    <select aria-label={`Status for ${order.order_number}`} value={order.status} onChange={e => changeOrderStatus(order, e.target.value as OrderStatus)}><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
                    <button className="secondary order-action" title="Edit order details" aria-label={`Edit ${order.order_number}`} onClick={() => editOrder(order)}><Pencil size={16}/><span className="action-label">Edit details</span></button>
                    <button className="secondary order-action" title="Print order slip" aria-label={`Print slip for ${order.order_number}`} onClick={() => setPrintingOrder(order)}><Printer size={16}/><span className="action-label">Print slip</span></button>
                    {order.balance > 0 && <button className="secondary order-action" title="Add payment" aria-label={`Add payment for ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={17}/><span className="action-label">Add payment</span></button>}
                  </div>
                </div>
                {order.notes && <p className="notes">{order.notes}</p>}
              </article>)}
              {!customerOrders.length && <div className="empty">No orders yet. Create the first order above.</div>}
              <ListPagination label="Customer order" page={customerOrdersPage} pageSize={LIST_PAGE_SIZE} total={customerOrders.length} onPage={setCustomerOrdersPage}/>
            </div>
          </section>
          <section className="panel">
            <div className="section-head"><div><h2>New measurement profile</h2><p className="muted">Choose a garment and fitting style.</p></div></div>
            <form className="form-grid" onSubmit={createProfile}>
              <label>Garment template<select required value={selectedTemplate?.id ?? ''} onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value) ?? null)}>
                <option value="">Choose garment…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
              <label>Profile name<input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder={selectedTemplate?.name ?? 'e.g. Wedding regular fit'}/></label>
              <button className="primary" disabled={busy || !selectedTemplate}><Plus size={17}/>Create profile</button>
            </form>
          </section>
        </>}

        {view === 'measure' && selectedCustomer && selectedProfile && selectedTemplate && <>
          <button className="back-button" onClick={() => setView('customer')}><ArrowLeft size={16}/> {selectedCustomer.name}</button>
          <section className="hero compact"><p className="eyebrow">{selectedTemplate.category.toUpperCase()} · {selectedProfile.profile_name}</p><h1>Measurements</h1><p className="muted">A new save creates a new version. Previous records remain preserved.</p></section>
          <form className="panel" onSubmit={saveMeasurement}>
            <div className="form-grid">
              <label>Unit<select value={unit} onChange={e => changeUnit(e.target.value as 'inches' | 'cm')}><option value="inches">Inches</option><option value="cm">Centimetres</option></select></label>
              <label>Fit preference<select value={fit} onChange={e => setFit(e.target.value)}><option value="regular">Regular</option><option value="slim">Slim</option><option value="loose">Loose</option><option value="custom">Custom</option></select></label>
            </div>
            <div className="measurement-grid">
              {selectedTemplate.fields.map((field: Field) => <label key={field.key}>{field.label} ({unit})<input type="number" required={field.required} min={field.min ?? 0.1} max={field.max ?? 100} step={field.step ?? 0.25} value={formValues[field.key] ?? ''} onChange={e => setFormValues(v => ({...v, [field.key]: e.target.value}))} inputMode="decimal" placeholder="—" /></label>)}
            </div>
            <label>Fitting / design notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Special fitting instructions…"/></label>
            <div className="form-actions"><button className="secondary" type="button" onClick={() => setView('customer')}>Cancel</button><button className="primary" disabled={busy}><Check size={17}/>{busy ? 'Saving…' : 'Save measurements'}</button></div>
          </form>
        </>}

        {view === 'history' && selectedCustomer && selectedProfile && <>
          <button className="back-button" onClick={() => setView('customer')}><ArrowLeft size={16}/> {selectedCustomer.name}</button>
          <section className="hero compact"><p className="eyebrow">MEASUREMENT HISTORY</p><h1>{selectedProfile.profile_name}</h1><p className="muted">Historical records are read-only.</p></section>
          {pagedHistory.map(m => { const latest = latestByProfile.get(m.profile_id); return <section className="panel history-card" key={m.id}>
            <div className="section-head"><div><h2>Version {m.version}</h2><p className="muted">{new Date(m.measured_at).toLocaleString()} · {m.unit}</p></div><span className="pill">Saved</span></div>
            {latest && latest.id !== m.id && latest.unit === m.unit && <p className="muted">Compared with latest v{latest.version}; positive values are larger than the latest measurement.</p>}
            <div className="saved-grid">{Object.entries(m.measurements).map(([key, value]) => { const delta = latest && latest.id !== m.id && latest.unit === m.unit && latest.measurements[key] !== undefined ? Number((value - latest.measurements[key]).toFixed(2)) : null; return <div key={key}><small>{key.replaceAll('_',' ')}</small><b>{value} {m.unit === 'cm' ? 'cm' : 'in'}</b>{delta !== null && <small className="measurement-delta">{delta > 0 ? '+' : ''}{delta} vs latest</small>}</div> })}</div>
            {m.fit_preference && <p className="muted">Fit: {m.fit_preference}</p>}
            {m.notes && <p className="notes">{m.notes}</p>}
          </section>})}
          <ListPagination label="Measurement history" page={historyPage} pageSize={HISTORY_PAGE_SIZE} total={selectedHistory.length} onPage={setHistoryPage}/>
          {history.some(m => m.profile_id === selectedProfile.id) && <button className="secondary print-history" onClick={printCurrent}><Printer size={15}/> Print measurement sheet</button>}
          {!selectedHistory.length && <div className="empty">No saved measurements yet.</div>}
        </>}

        {view === 'measurements' && <>
          <section className="page-heading"><div><p className="eyebrow">MEASUREMENT BOOK</p><h1>Measurements</h1><p className="muted">Find a customer's garment profile and open its saved history.</p></div></section>
          <section className="panel">
            <div className="searchbox"><Search size={18}/><input value={measurementQuery} onChange={e => { setMeasurementQuery(e.target.value); setMeasurementPage(0) }} placeholder="Search customer, phone, garment, or profile"/></div>
            <div className="measurement-index">
              {pagedMeasurementProfiles.map(profile => <button className="measurement-index-row" key={profile.id} onClick={() => openMeasurementHistory(profile)}>
                <span className="profile-icon"><Ruler size={17}/></span><span className="measurement-index-main"><b>{profile.customer_name}</b><small>{profile.customer_code} · {profile.phone || 'No phone'}</small></span><span className="measurement-index-garment"><b>{profile.profile_name}</b><small>{profile.template_name} · {profile.category}</small></span><span className="version-tag">{profile.latest_version ? `v${profile.latest_version}` : 'No record'}</span><ChevronRight size={17}/>
              </button>)}
              {!visibleMeasurementProfiles.length && <div className="empty"><Ruler size={24}/><b>No measurement profiles found</b><span>Create a profile from a customer record.</span></div>}
            </div>
            <ListPagination label="Measurement profile" page={measurementPage} pageSize={LIST_PAGE_SIZE} total={visibleMeasurementProfiles.length} onPage={setMeasurementPage}/>
          </section>
        </>}

        {view === 'reports' && <>
          <section className="page-heading"><div><p className="eyebrow">SHOP SUMMARY</p><h1>Reports & exports</h1><p className="muted">Download current customer and order records for your own files.</p></div></section>
          <section className="dashboard-stats report-stats">
            <div className="stat-card"><span className="stat-icon stat-green"><Users size={18}/></span><b>{allCustomerCount.toLocaleString('en-IN')}</b><small>Customers</small></div>
            <div className="stat-card"><span className="stat-icon stat-gold"><ClipboardList size={18}/></span><b>{allOrders.length.toLocaleString('en-IN')}</b><small>Total orders</small></div>
            <div className="stat-card"><span className="stat-icon stat-green"><span className="rupee-mark">₹</span></span><b>₹{allOrders.reduce((sum, order) => sum + order.advance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Advance collected</small></div>
            <div className="stat-card"><span className="stat-icon stat-red"><Clock3 size={18}/></span><b>₹{allOrders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + order.balance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Balance outstanding</small></div>
          </section>
          <section className="panel export-panel"><div><h2>Download your data</h2><p className="muted">Exports include customer contact details or order/payment summaries.</p></div><div className="export-actions"><button className="secondary" onClick={exportCustomersCsv}><Download size={16}/> Export customers CSV</button><button className="primary" onClick={exportOrdersCsv}><Download size={16}/> Export orders CSV</button></div></section>
        </>}

        {view === 'orders' && <>
          <button className="back-button" onClick={() => setView('home')}><ArrowLeft size={16}/> Dashboard</button>
          <section className="hero compact"><p className="eyebrow">SHOP WORKFLOW</p><h1>Orders</h1><p className="muted">{allOrders.filter(o => !['delivered','cancelled'].includes(o.status)).length} open · {allOrders.length} total</p></section>
          <section className="panel"><div className="section-head"><div><h2>All orders</h2><p className="muted">Review status, delivery dates and balances.</p></div><button className="secondary" onClick={exportOrdersCsv}><Download size={15}/> Export CSV</button></div>
            <div className="orders-filters"><div className="searchbox"><Search size={17}/><input value={orderQuery} onChange={e => { setOrderQuery(e.target.value); setOrdersPage(0) }} placeholder="Search order, customer, phone, or garment"/></div><select aria-label="Filter by order status" value={orderStatusFilter} onChange={e => { setOrderStatusFilter(e.target.value); setOrdersPage(0) }}><option value="">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
            {pagedOrders.map(order => <article className="order-card" key={order.id}>
            <div className="order-row"><div className="order-main"><b>{order.customer_name} · {order.garment_name}</b><small>{order.order_number} · Due {new Date(order.due_date).toLocaleDateString()} · Balance ₹{order.balance.toFixed(2)}</small></div>
              <div className="order-controls">
                <select aria-label={`Status for ${order.order_number}`} value={order.status} onChange={e => changeOrderStatus(order, e.target.value as OrderStatus)}><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
                <button className="secondary order-action" title="Edit order details" aria-label={`Edit ${order.order_number}`} onClick={() => editOrder(order)}><Pencil size={16}/><span className="action-label">Edit details</span></button>
                <button className="secondary order-action" title="Print order slip" aria-label={`Print slip for ${order.order_number}`} onClick={() => setPrintingOrder(order)}><Printer size={16}/><span className="action-label">Print slip</span></button>
                {order.balance > 0 && <button className="secondary order-action" title="Add payment" aria-label={`Add payment for ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={17}/><span className="action-label">Add payment</span></button>}
              </div>
            </div>
          </article>)}{allOrders.length > 0 && !visibleOrders.length && <div className="empty">No orders match this search.</div>}{!allOrders.length && <div className="empty"><ClipboardList size={24}/><b>No orders yet</b><span>Create an order from a customer profile.</span></div>}<ListPagination label="Order" page={ordersPage} pageSize={LIST_PAGE_SIZE} total={visibleOrders.length} onPage={setOrdersPage}/></section>
        </>}
      </main>
      </div>
      {paymentOrder && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPaymentOrder(null) }}>
        <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <button className="icon-button modal-close" type="button" title="Close payment form" onClick={() => setPaymentOrder(null)}><X size={17}/></button>
          <p className="eyebrow">RECORD PAYMENT</p><h2 id="payment-title">Add a payment</h2>
          <p className="muted">{paymentOrder.customer_name} · {paymentOrder.order_number}</p>
          <div className="payment-balance"><span>Remaining balance</span><b>₹{paymentOrder.balance.toFixed(2)}</b></div>
          <form onSubmit={addOrderPayment}>
            <label>Amount received today<input autoFocus type="number" inputMode="decimal" min="0.01" max={paymentOrder.balance.toFixed(2)} step="0.01" value={paymentAmount} onChange={e => { setPaymentAmount(e.target.value); setError('') }} placeholder="0.00" required/></label>
            <p className="payment-preview">Balance after payment <b>₹{Math.max(0, paymentOrder.balance - (Number(paymentAmount) || 0)).toFixed(2)}</b></p>
            {error && <p className="error payment-error">{error}</p>}
            <div className="form-actions"><button className="secondary" type="button" onClick={() => setPaymentOrder(null)}>Cancel</button><button className="primary" disabled={busy || !(Number(paymentAmount) > 0) || Number(paymentAmount) > paymentOrder.balance}><Check size={16}/>{busy ? 'Saving…' : 'Save payment'}</button></div>
          </form>
        </section>
      </div>}
      {printingOrder && <section className="print-slip">
        <p className="eyebrow">SHREE RADHE BOUTIQUE</p><h1>Order slip</h1>
        <p><b>Order:</b> {printingOrder.order_number}</p><p><b>Customer:</b> {printingOrder.customer_name}</p>
        {printingOrder.customer_phone && <p><b>Phone:</b> {printingOrder.customer_phone}</p>}
        <p><b>Garment / work:</b> {printingOrder.garment_name}</p><p><b>Delivery date:</b> {new Date(printingOrder.due_date).toLocaleDateString()}</p>
        <p><b>Status:</b> {printingOrder.status.replace('_',' ')}</p><hr/>
        <p><b>Total:</b> ₹{printingOrder.price.toFixed(2)}</p><p><b>Advance paid:</b> ₹{printingOrder.advance.toFixed(2)}</p><p><b>Balance due:</b> ₹{printingOrder.balance.toFixed(2)}</p>
        {printingOrder.notes && <p><b>Notes:</b> {printingOrder.notes}</p>}
        <p className="receipt-thanks">Thank you</p>
      </section>}
      <footer className="app-footer">Private workspace · Measurement records stay under your control</footer>
    </div>
  )
}
