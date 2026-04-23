import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { alertApi } from '../../api'

export default function AppLayout() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await alertApi.getCount()
        setUnreadCount(data.unread)
      } catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar unreadCount={unreadCount} />
      <main style={{
        flex: 1, overflow: 'auto', padding: '28px 32px',
        background: 'var(--bg)',
      }}>
        <Outlet context={{ refreshAlerts: () => alertApi.getCount().then(r => setUnreadCount(r.data.unread)).catch(() => {}) }} />
      </main>
    </div>
  )
}
