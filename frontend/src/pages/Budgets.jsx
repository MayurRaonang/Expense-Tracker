import { useState, useEffect, useCallback } from 'react'
import { Plus, Target, Trash2, Edit2 } from 'lucide-react'
import { budgetApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Badge, EmptyState, Spinner, PageHeader, ProgressBar, Select } from '../components/ui'
import BudgetForm from '../components/BudgetForm'
import { formatCurrency, CATEGORY_COLORS } from '../utils/helpers'
import toast from 'react-hot-toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Budgets() {
  const { user } = useAuth()
  const currency = user?.currency || 'INR'
  const now = new Date()

  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await budgetApi.getAll({ month, year })
      setBudgets(data)
    } catch { toast.error('Failed to load budgets') }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return
    setDeleting(id)
    try {
      await budgetApi.delete(id)
      toast.success('Budget deleted')
      setBudgets(prev => prev.filter(b => b.id !== id))
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(null) }
  }

  const openAdd  = () => { setEditData(null); setShowForm(true) }
  const openEdit = (b) => { setEditData(b); setShowForm(true) }

  const totalLimit = budgets.reduce((s, b) => s + Number(b.monthlyLimit), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0)
  const overBudget = budgets.filter(b => Number(b.spent) > Number(b.monthlyLimit))

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Budgets"
        description={`${MONTHS[month - 1]} ${year} · ${budgets.length} categories tracked`}
        action={<Button onClick={openAdd}><Plus size={15} /> Set budget</Button>}
      />

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center' }}>
        <Select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: '130px' }}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </Select>
        <Select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '100px' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {/* Summary strip */}
      {budgets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <SummaryCard label="Total budget" value={formatCurrency(totalLimit, currency)} color="var(--accent)" />
          <SummaryCard label="Total spent" value={formatCurrency(totalSpent, currency)} color={totalSpent > totalLimit ? 'var(--danger)' : 'var(--success)'} />
          <SummaryCard label="Over budget" value={`${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'}`} color={overBudget.length > 0 ? 'var(--danger)' : 'var(--success)'} />
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px', color: 'var(--text-muted)' }}>
          <Spinner size={18} /> <span style={{ fontSize: '13px' }}>Loading...</span>
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="No budgets set"
            description={`Set monthly spending limits for ${MONTHS[month-1]} ${year} to track how you're doing`}
            action={<Button onClick={openAdd}><Plus size={14} /> Set budget</Button>}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              currency={currency}
              onEdit={() => openEdit(b)}
              onDelete={() => handleDelete(b.id)}
              isDeleting={deleting === b.id}
            />
          ))}
        </div>
      )}

      <BudgetForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditData(null) }}
        onSuccess={fetchBudgets}
        editData={editData}
      />
    </div>
  )
}

function BudgetCard({ budget, currency, onEdit, onDelete, isDeleting }) {
  const { category, monthlyLimit, spent = 0, percentUsed = 0 } = budget
  const catColor = CATEGORY_COLORS[category] || 'var(--text-muted)'
  const isOver = Number(spent) > Number(monthlyLimit)
  const isWarning = percentUsed >= 80 && !isOver
  const remaining = Number(monthlyLimit) - Number(spent)

  return (
    <Card style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px' }}>{getCategoryEmoji(category)}</span>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{category}</p>
            {isOver
              ? <Badge color="var(--danger)">Over budget</Badge>
              : isWarning
              ? <Badge color="var(--warning)">Almost full</Badge>
              : <Badge color="var(--success)">On track</Badge>
            }
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={onEdit}
            style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Edit2 size={11} />
          </button>
          <button onClick={onDelete} disabled={isDeleting}
            style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.borderColor = 'rgba(242,92,92,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {isDeleting ? <Spinner size={11} /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {formatCurrency(spent, currency)} spent
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            of {formatCurrency(monthlyLimit, currency)}
          </span>
        </div>
        <ProgressBar percent={percentUsed} color={catColor} height={8} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: isOver ? 'var(--danger)' : 'var(--text-secondary)' }}>
          {isOver
            ? `${formatCurrency(Math.abs(remaining), currency)} over`
            : `${formatCurrency(remaining, currency)} remaining`
          }
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: isOver ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>
          {percentUsed.toFixed(0)}%
        </span>
      </div>
    </Card>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <Card style={{ padding: '16px' }}>
      <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{value}</p>
    </Card>
  )
}

function getCategoryEmoji(cat) {
  const map = { Food: '🍜', Transport: '🚗', Shopping: '🛍️', Entertainment: '🎬', Health: '💊', Utilities: '⚡', Education: '📚', Travel: '✈️', Other: '📦' }
  return map[cat] || '💰'
}
