import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import { CATEGORY_COLORS } from '../../utils/helpers'

const tooltipStyle = {
  contentStyle: { background: '#1e2026', border: '1px solid #2a2d35', borderRadius: '8px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' },
  labelStyle: { color: '#f0f1f3', fontWeight: 600 },
  itemStyle: { color: '#8b8f9a' },
  cursor: { fill: 'rgba(79,110,247,0.06)' },
}

// Monthly spending bar chart
export function MonthlyBarChart({ data }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#8b8f9a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b8f9a', fontSize: 11 }} axisLine={false} tickLine={false} width={50}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, 'Spent']} />
        <Bar dataKey="total" fill="#4f6ef7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Category breakdown pie chart
export function CategoryPieChart({ data }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          dataKey="value" paddingAngle={3} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#555a68'} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v, n) => [`₹${Number(v).toLocaleString()}`, n]} />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(value) => <span style={{ color: '#8b8f9a', fontSize: '11px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Line chart for trend
export function TrendLineChart({ data }) {
  if (!data?.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" />
        <XAxis dataKey="month" tick={{ fill: '#8b8f9a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b8f9a', fontSize: 11 }} axisLine={false} tickLine={false} width={50}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`₹${v.toLocaleString()}`, 'Total']} />
        <Line type="monotone" dataKey="total" stroke="#4f6ef7" strokeWidth={2} dot={{ fill: '#4f6ef7', r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function NoData() {
  return (
    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
      No data yet
    </div>
  )
}
