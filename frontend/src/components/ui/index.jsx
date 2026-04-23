import { useEffect } from 'react'
import { X } from 'lucide-react'

const styles = {
  // ── Button ───────────────────────────────────────────────
  btn: {
    base: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '7px', fontFamily: 'var(--font-sans)', fontWeight: 500,
      borderRadius: 'var(--radius-md)', transition: 'all 0.15s ease',
      cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
    },
    sizes: {
      sm: { padding: '6px 12px', fontSize: '12px' },
      md: { padding: '9px 16px', fontSize: '13px' },
      lg: { padding: '12px 22px', fontSize: '14px' },
    },
    variants: {
      primary: { background: 'var(--accent)', color: '#fff' },
      secondary: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
      ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
      danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(242,92,92,0.25)' },
      success: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(52,217,123,0.25)' },
    },
  },
}

// ── Button ───────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, onClick, type = 'button', style = {} }) {
  const s = { ...styles.btn.base, ...styles.btn.sizes[size], ...styles.btn.variants[variant], opacity: disabled || loading ? 0.6 : 1, ...style }
  return (
    <button type={type} style={s} disabled={disabled || loading} onClick={onClick}>
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────
export function Input({ label, error, prefix, suffix, style = {}, ...props }) {
  const wrapStyle = { display: 'flex', flexDirection: 'column', gap: '5px' }
  const labelStyle = { fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }
  const inputWrapStyle = { position: 'relative', display: 'flex', alignItems: 'center' }
  const inputStyle = {
    width: '100%', background: 'var(--bg-input)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: prefix ? '9px 12px 9px 36px' : '9px 12px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.15s',
    fontFamily: 'var(--font-sans)', ...style,
  }
  const prefixStyle = { position: 'absolute', left: '12px', color: 'var(--text-muted)', fontSize: '13px', pointerEvents: 'none' }
  const errorStyle = { fontSize: '11px', color: 'var(--danger)' }
  return (
    <div style={wrapStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapStyle}>
        {prefix && <span style={prefixStyle}>{prefix}</span>}
        <input style={inputStyle} {...props}
          onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
          onBlur={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'}
        />
        {suffix && <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>{suffix}</span>}
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────
export function Select({ label, error, children, style = {}, ...props }) {
  const selectStyle = {
    width: '100%', background: 'var(--bg-input)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '9px 12px',
    fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8f9a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px', ...style,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <select style={selectStyle} {...props}>{children}</select>
      {error && <span style={{ fontSize: '11px', color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px', ...style,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'var(--accent)', icon: Icon, style = {} }) {
  return (
    <Card style={{ ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>{value}</p>
          {sub && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</p>}
        </div>
        {Icon && (
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} color={color} />
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ children, color = 'var(--accent)', bg, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
      borderRadius: '20px', fontSize: '11px', fontWeight: 500,
      background: bg || `${color}18`, color, ...style,
    }}>
      {children}
    </span>
  )
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
      {Icon && <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}><Icon size={22} color="var(--text-muted)" /></div>}
      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{title}</p>
      {description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, width = '460px' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handler = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', handler)
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler) }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="animate-fade-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', padding: '4px', borderRadius: 'var(--radius-sm)', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Progress Bar ─────────────────────────────────────────────
export function ProgressBar({ percent, color = 'var(--accent)', height = 6 }) {
  const capped = Math.min(percent, 100)
  const barColor = percent > 100 ? 'var(--danger)' : percent > 80 ? 'var(--warning)' : color
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-hover)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${capped}%`, height: '100%', background: barColor, borderRadius: '99px', transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ── Page Header ──────────────────────────────────────────────
export function PageHeader({ title, description, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h1>
        {description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
