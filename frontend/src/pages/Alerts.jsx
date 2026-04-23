import { useState, useEffect, useCallback } from 'react'
import { Bell, AlertTriangle, TrendingUp, CheckCheck, Check } from 'lucide-react'
import { alertApi } from '../api'
import { Button, Card, EmptyState, Spinner, PageHeader, Badge } from '../components/ui'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const ALERT_META = {
  ANOMALY:          { color: 'var(--danger)',  bg: 'var(--danger-soft)',  icon: AlertTriangle, label: 'Anomaly'         },
  BUDGET_WARNING:   { color: 'var(--warning)', bg: 'var(--warning-soft)', icon: TrendingUp,    label: 'Budget warning'  },
  BUDGET_EXCEEDED:  { color: 'var(--danger)',  bg: 'var(--danger-soft)',  icon: AlertTriangle, label: 'Budget exceeded' },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await alertApi.getAll()
      setAlerts(data)
    } catch { toast.error('Failed to load alerts') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await alertApi.markAllRead()
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
      toast.success('All alerts marked as read')
    } catch { toast.error('Failed to update') }
    finally { setMarking(false) }
  }

  const markOneRead = async (id) => {
    try {
      await alertApi.markRead(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    } catch { toast.error('Failed to update') }
  }

  const filtered = showUnreadOnly ? alerts.filter(a => !a.isRead) : alerts
  const unreadCount = alerts.filter(a => !a.isRead).length

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Alerts"
        description={`${unreadCount} unread · ${alerts.length} total`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={showUnreadOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowUnreadOnly(f => !f)}
            >
              <Bell size={13} />
              {showUnreadOnly ? 'All alerts' : 'Unread only'}
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllRead} loading={marking}>
                <CheckCheck size={13} /> Mark all read
              </Button>
            )}
          </div>
        }
      />

      {/* Stats strip */}
      {alerts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <MiniStat label="Total" value={alerts.length} color="var(--accent)" />
          <MiniStat label="Unread" value={unreadCount} color="var(--warning)" />
          <MiniStat label="Anomalies" value={alerts.filter(a => a.alertType === 'ANOMALY').length} color="var(--danger)" />
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px', color: 'var(--text-muted)' }}>
          <Spinner size={18} /> <span style={{ fontSize: '13px' }}>Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={showUnreadOnly ? 'All caught up!' : 'No alerts yet'}
            description={showUnreadOnly ? 'No unread alerts. You\'re on top of things.' : 'Alerts will appear here when anomalies are detected or budgets are exceeded.'}
            action={showUnreadOnly ? <Button variant="secondary" size="sm" onClick={() => setShowUnreadOnly(false)}>View all alerts</Button> : null}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} onMarkRead={() => markOneRead(alert.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert, onMarkRead }) {
  const meta = ALERT_META[alert.alertType] || ALERT_META.ANOMALY
  const Icon = meta.icon

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '16px', borderRadius: 'var(--radius-lg)',
      background: alert.isRead ? 'var(--bg-card)' : `${meta.bg}`,
      border: `1px solid ${alert.isRead ? 'var(--border)' : meta.color + '30'}`,
      transition: 'all 0.2s',
      opacity: alert.isRead ? 0.7 : 1,
    }}>
      {/* Icon */}
      <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={meta.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <Badge color={meta.color}>{meta.label}</Badge>
          {!alert.isRead && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {formatDate(alert.createdAt)}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{alert.message}</p>
      </div>

      {/* Mark read button */}
      {!alert.isRead && (
        <button
          onClick={onMarkRead}
          title="Mark as read"
          style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--success)'; e.currentTarget.style.borderColor = 'rgba(52,217,123,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <Check size={13} />
        </button>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</p>
    </Card>
  )
}
