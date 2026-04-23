import { format, parseISO } from 'date-fns'

export const CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment',
  'Health', 'Utilities', 'Education', 'Travel', 'Other'
]

export const CATEGORY_COLORS = {
  Food:          '#4f6ef7',
  Transport:     '#2dd4bf',
  Shopping:      '#a78bfa',
  Entertainment: '#f5a623',
  Health:        '#34d97b',
  Utilities:     '#f25c5c',
  Education:     '#60a5fa',
  Travel:        '#fb923c',
  Other:         '#8b8f9a',
  Uncategorised: '#555a68',
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
]

export function formatCurrency(amount, currency = 'INR') {
  const c = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  return `${c.symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try { return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, 'dd MMM yyyy') }
  catch { return dateStr }
}

export function formatDateInput(dateStr) {
  if (!dateStr) return ''
  try { return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, 'yyyy-MM-dd') }
  catch { return '' }
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function getAnomalyLabel(score) {
  if (score === null || score === undefined || score === 0) return null
  if (score < -0.3) return { label: 'High anomaly', color: 'var(--danger)' }
  if (score < -0.1) return { label: 'Flagged',      color: 'var(--warning)' }
  return null
}

export function groupByMonth(transactions) {
  const groups = {}
  transactions.forEach(t => {
    const key = t.transactionDate?.slice(0, 7) // "2026-04"
    if (!key) return
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  return groups
}

export function sumByCategory(transactions) {
  const sums = {}
  transactions.forEach(t => {
    const cat = t.category || 'Uncategorised'
    sums[cat] = (sums[cat] || 0) + Number(t.amount)
  })
  return Object.entries(sums)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildMonthlyTrend(transactions) {
  const monthly = {}
  transactions.forEach(t => {
    const key = t.transactionDate?.slice(0, 7)
    if (!key) return
    monthly[key] = (monthly[key] || 0) + Number(t.amount)
  })
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, total]) => ({
      month: format(parseISO(`${month}-01`), 'MMM yy'),
      total: Math.round(total)
    }))
}
