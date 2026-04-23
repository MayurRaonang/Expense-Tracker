import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, ArrowLeftRight, Target, Zap } from 'lucide-react'
import { transactionApi, alertApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { StatCard, Card, Badge, EmptyState, Spinner, PageHeader } from '../components/ui'
import { MonthlyBarChart, CategoryPieChart } from '../components/charts'
import { formatCurrency, formatDate, sumByCategory, buildMonthlyTrend, CATEGORY_COLORS, getAnomalyLabel } from '../utils/helpers'

export default function Dashboard() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [txRes, alertRes] = await Promise.all([
          transactionApi.getAll(),
          alertApi.getAll({ unreadOnly: true }),
        ])
        setTransactions(txRes.data)
        setAlerts(alertRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  // Compute stats
  const now = new Date()
  const thisMonthTxns = transactions.filter(t => {
    const d = new Date(t.transactionDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalThisMonth = thisMonthTxns.reduce((s, t) => s + Number(t.amount), 0)
  const totalAll = transactions.reduce((s, t) => s + Number(t.amount), 0)
  const flagged = transactions.filter(t => t.isFlagged)
  const recentTxns = [...transactions].slice(0, 8)
  const categoryData = sumByCategory(thisMonthTxns)
  const trendData = buildMonthlyTrend(transactions)
  const currency = user?.currency || 'INR'

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.fullName?.split(' ')[0]} 👋`}
        description="Here's your spending overview"
      />

      {/* Unread alerts banner */}
      {alerts.length > 0 && (
        <div style={{ background: 'rgba(242,92,92,0.08)', border: '1px solid rgba(242,92,92,0.2)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 500 }}>
            {alerts.length} unread alert{alerts.length > 1 ? 's' : ''} — {alerts.filter(a => a.alertType === 'ANOMALY').length} anomalies detected
          </span>
          <a href="/alerts" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--danger)', fontWeight: 600, textDecoration: 'underline' }}>View all</a>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="This month" value={formatCurrency(totalThisMonth, currency)} sub={`${thisMonthTxns.length} transactions`} color="var(--accent)" icon={TrendingUp} />
        <StatCard label="Total tracked" value={formatCurrency(totalAll, currency)} sub={`${transactions.length} transactions`} color="var(--teal)" icon={ArrowLeftRight} />
        <StatCard label="Anomalies flagged" value={flagged.length} sub="unusual transactions" color="var(--danger)" icon={AlertTriangle} />
        <StatCard label="Unread alerts" value={alerts.length} sub="need attention" color="var(--warning)" icon={Zap} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        <Card>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Monthly spending</p>
          <MonthlyBarChart data={trendData} />
        </Card>
        <Card>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>This month by category</p>
          <CategoryPieChart data={categoryData} />
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent transactions</p>
          <a href="/transactions" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>View all →</a>
        </div>
        {recentTxns.length === 0
          ? <EmptyState icon={ArrowLeftRight} title="No transactions yet" description="Add your first transaction to get started" />
          : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentTxns.map((t, i) => (
              <TxnRow key={t.id} t={t} currency={currency} isLast={i === recentTxns.length - 1} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function TxnRow({ t, currency, isLast }) {
  const anomaly = getAnomalyLabel(t.anomalyScore)
  const catColor = CATEGORY_COLORS[t.category] || 'var(--text-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: catColor }}>{(t.merchant || '?')[0].toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</p>
          {anomaly && <Badge color={anomaly.color} style={{ fontSize: '10px', padding: '1px 6px' }}>{anomaly.label}</Badge>}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.category || 'Uncategorised'} · {formatDate(t.transactionDate)}</p>
      </div>
      <p style={{ fontSize: '14px', fontWeight: 600, color: t.isFlagged ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        -{formatCurrency(t.amount, currency)}
      </p>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--text-muted)' }}>
      <Spinner size={20} /> <span style={{ fontSize: '14px' }}>Loading dashboard...</span>
    </div>
  )
}
