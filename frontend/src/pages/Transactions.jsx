import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Trash2, Edit2, AlertTriangle, ArrowLeftRight } from 'lucide-react'
import { transactionApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Badge, EmptyState, Spinner, PageHeader, Select } from '../components/ui'
import TransactionForm from '../components/TransactionForm'
import { formatCurrency, formatDate, CATEGORIES, CATEGORY_COLORS, getAnomalyLabel } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const currency = user?.currency || 'INR'

  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await transactionApi.getAll()
      setTransactions(data)
    } catch { toast.error('Failed to load transactions') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    setDeleting(id)
    try {
      await transactionApi.delete(id)
      toast.success('Transaction deleted')
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(null) }
  }

  const openEdit = (t) => { setEditData(t); setShowForm(true) }
  const openAdd  = () => { setEditData(null); setShowForm(true) }

  // Filter
  const filtered = transactions.filter(t => {
    if (filterFlagged && !t.isFlagged) return false
    if (filterCategory && t.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return t.merchant?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)
    }
    return true
  })

  const total = filtered.reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Transactions"
        description={`${filtered.length} transactions · ${formatCurrency(total, currency)} total`}
        action={<Button onClick={openAdd}><Plus size={15} /> Add transaction</Button>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Search merchant, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '9px 12px 9px 33px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
            onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: '160px' }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button
          variant={filterFlagged ? 'danger' : 'secondary'}
          onClick={() => setFilterFlagged(f => !f)}
          size="md"
        >
          <AlertTriangle size={14} />
          {filterFlagged ? 'Flagged only' : 'Show flagged'}
        </Button>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px', color: 'var(--text-muted)' }}>
            <Spinner size={18} /> <span style={{ fontSize: '13px' }}>Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions found"
            description={search || filterCategory ? 'Try changing your filters' : 'Add your first transaction to get started'}
            action={!search && !filterCategory && <Button onClick={openAdd}><Plus size={14} /> Add transaction</Button>}
          />
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
              {['Merchant', 'Category', 'Date', 'Amount', 'Actions'].map(h => (
                <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: h === 'Amount' || h === 'Actions' ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {/* Rows */}
            <div>
              {filtered.map((t, i) => (
                <TxnTableRow
                  key={t.id}
                  t={t}
                  currency={currency}
                  isLast={i === filtered.length - 1}
                  onEdit={() => openEdit(t)}
                  onDelete={() => handleDelete(t.id)}
                  isDeleting={deleting === t.id}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      <TransactionForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditData(null) }}
        onSuccess={fetchTransactions}
        editData={editData}
      />
    </div>
  )
}

function TxnTableRow({ t, currency, isLast, onEdit, onDelete, isDeleting }) {
  const [hovered, setHovered] = useState(false)
  const anomaly = getAnomalyLabel(t.anomalyScore)
  const catColor = CATEGORY_COLORS[t.category] || 'var(--text-muted)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', gap: '12px',
        padding: '13px 20px', alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      {/* Merchant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: catColor }}>{(t.merchant || '?')[0].toUpperCase()}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
            {t.isFlagged && <AlertTriangle size={12} color="var(--danger)" />}
          </div>
          {t.notes && <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.notes}</span>}
        </div>
      </div>

      {/* Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <Badge color={catColor}>{t.category || 'Uncategorised'}</Badge>
        {t.autoCategory && t.autoCategory !== t.category && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ML: {t.autoCategory}</span>
        )}
      </div>

      {/* Date */}
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(t.transactionDate)}</span>

      {/* Amount */}
      <span style={{ fontSize: '14px', fontWeight: 600, color: t.isFlagged ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        -{formatCurrency(t.amount, currency)}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="Edit"
          style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: hovered ? 'var(--bg)' : 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Edit2 size={12} />
        </button>
        <button onClick={onDelete} title="Delete" disabled={isDeleting}
          style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,92,92,0.3)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          {isDeleting ? <Spinner size={12} /> : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  )
}
