'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const PAGE_SIZE = 20

interface Visitor {
  id: number
  google_id: number
  email: string
  full_name: string | null
  avatar_url: string | null
  whatsapp_number: string
  country_code: string
  created_at: string
  last_login: string
}

/* ── Skeleton rows ─────────────────────────────────────────── */

function SkeletonRows({ count = 5 }: { count?: number }) {
  const widths = [
    [40, 140, 160, 130, 120, 100],
    [40, 130, 150, 140, 110, 100],
    [40, 150, 140, 120, 130, 100],
    [40, 120, 155, 135, 115, 100],
    [40, 145, 145, 125, 125, 100],
  ]

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const w = widths[i % widths.length]
        return (
          <tr key={i} className="sf-skeleton-row">
            {w.map((width, j) => (
              <td key={j}><div className="sf-skeleton-block" style={{ width }} /></td>
            ))}
          </tr>
        )
      })}</>
  )
}

/* ── Pagination ────────────────────────────────────────────── */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | string)[] = []
  pages.push(1)
  if (currentPage > 4) pages.push('…')
  for (let p = Math.max(2, currentPage - 2); p <= Math.min(totalPages - 1, currentPage + 2); p++) {
    pages.push(p)
  }
  if (currentPage < totalPages - 3) pages.push('…')
  if (totalPages > 1) pages.push(totalPages)

  return (
    <div className="sf-pagination" id="sf-visitors-pagination">
      <button
        className="sf-page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        &#8592; Prev
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="sf-page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`sf-page-btn ${p === currentPage ? 'sf-page-active' : ''}`}
            onClick={() => onPageChange(p as number)}
          >
            {p}
          </button>
        )
      )}
      <button
        className="sf-page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next &#8594;
      </button>
    </div>
  )
}

/* ── Helper for WhatsApp link ──────────────────────────────── */
function getWaLink(phone: string, countryCode: string) {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  let cc = (countryCode || '62').replace(/\D/g, '')
  if (!cc) cc = '62'

  if (cleaned.startsWith(cc) && cleaned.length > 8) {
    return `https://wa.me/${cleaned}`
  }
  return `https://wa.me/${cc}${cleaned}`
}

/* ── Format phone display ──────────────────────────────────── */
function formatPhone(phone: string, cc: string) {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
  const code = (cc || '62').replace(/\D/g, '') || '62'
  return `+${code} ${cleaned}`
}

/* ── Custom chart tooltip ──────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b',
      color: '#f1f5f9',
      padding: '10px 14px',
      borderRadius: '10px',
      fontSize: '13px',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      border: 'none',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {formatDate(new Date(label).toISOString())}
      </div>
      <div style={{ color: '#a78bfa' }}>
        {payload[0].value} visitor{payload[0].value !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

/* ── Main page component ───────────────────────────────────── */

export default function VisitorsAnalyticsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Chart
  const [growthData, setGrowthData] = useState<{ date: string; visitors: number }[]>([])
  const [totalVisitors, setTotalVisitors] = useState(0)
  const [todayVisitors, setTodayVisitors] = useState(0)
  const [thisWeekVisitors, setThisWeekVisitors] = useState(0)

  const [authed, setAuthed] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard
  useEffect(() => {
    if (!sessionStorage.getItem('sf_user')) {
      window.location.replace('/login')
      return
    }
    setAuthed(true)
  }, [])

  // ── Load Chart Data ──
  const loadChartData = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('website_visitors')
        .select('created_at')
        .order('created_at')

      if (err) {
        console.error('[Chart error]', err)
        return
      }

      if (data) {
        const total = data.length
        setTotalVisitors(total)

        // Aggregate by day
        const aggregated: Record<string, number> = {}
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        let todayCount = 0
        let weekCount = 0

        data.forEach((row) => {
          const date = new Date(row.created_at).toISOString().split('T')[0]
          aggregated[date] = (aggregated[date] || 0) + 1
          if (date === todayStr) todayCount++
          if (new Date(row.created_at) >= weekAgo) weekCount++
        })

        setTodayVisitors(todayCount)
        setThisWeekVisitors(weekCount)

        const chartData = Object.entries(aggregated)
          .map(([date, count]) => ({ date, visitors: count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setGrowthData(chartData)
      }
    } catch (err) {
      console.error('Error loading chart data', err)
    }
  }, [])

  // ── Load Table Data ──
  const loadVisitors = useCallback(async (page: number, query: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('website_visitors')
      .select('*', { count: 'exact' })
      .order('last_login', { ascending: false })
      .range(from, to)

    if (query) {
      // Search by name or email
      q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    }

    const { data, count, error: err } = await q

    if (err) {
      console.error('[Supabase error]', err)
      setError(err.message)
      setVisitors([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setVisitors((data as Visitor[]) || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) {
      loadChartData()
      loadVisitors(1, searchQuery)
    }
  }, [authed, loadChartData, loadVisitors])

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        loadVisitors(1, value.trim())
      }, 350)
    },
    [loadVisitors]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const totalPages = Math.ceil(totalCount / PAGE_SIZE)
      if (page < 1 || page > totalPages) return
      loadVisitors(page, searchQuery)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [loadVisitors, searchQuery, totalCount]
  )

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = (currentPage - 1) * PAGE_SIZE + visitors.length

  /* ── Format relative time for "last login" ── */
  function timeAgo(dateStr: string) {
    const now = new Date()
    const then = new Date(dateStr)
    const diffMs = now.getTime() - then.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Baru saja'
    if (diffMin < 60) return `${diffMin} menit lalu`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} jam lalu`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return `${diffDay} hari lalu`
    return formatDate(dateStr)
  }

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Analytics <span>Visitors</span>
          </h1>
        </div>
        <div className="sf-header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="sf-search-wrap" style={{ margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sf-search"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="sf-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--sf-text-muted)', marginBottom: 2 }}>Total Visitors</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sf-text)' }}>{totalVisitors.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="sf-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--sf-text-muted)', marginBottom: 2 }}>Hari Ini</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sf-text)' }}>{todayVisitors.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="sf-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--sf-text-muted)', marginBottom: 2 }}>7 Hari Terakhir</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sf-text)' }}>{thisWeekVisitors.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="sf-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>
          Pertumbuhan Visitor Harian
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          {growthData.length > 0 ? (
            <ResponsiveContainer>
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#visitorGradient)"
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Belum ada data visitor.
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Nama</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Terakhir Login</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={5} />
              ) : error ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Belum ada data visitor</h3>
                      <p>Belum ada visitor yang terdaftar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visitors.map((v, idx) => {
                  const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1

                  return (
                    <tr key={v.id}>
                      <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{rowNum}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {v.avatar_url ? (
                            <img
                              src={v.avatar_url}
                              alt=""
                              style={{
                                width: 32, height: 32, borderRadius: '50%',
                                objectFit: 'cover', flexShrink: 0,
                                border: '2px solid var(--sf-border)',
                              }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '13px', fontWeight: 600, flexShrink: 0,
                            }}>
                              {(v.full_name || v.email || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="sf-merchant-name" style={{ fontSize: '14px' }}>
                            {v.full_name || '-'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`mailto:${v.email}`}
                          title={`Kirim email ke ${v.email}`}
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 500,
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#3b82f6')}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          {v.email}
                        </a>
                      </td>
                      <td>
                        {v.whatsapp_number ? (
                          <a
                            href={getWaLink(v.whatsapp_number, v.country_code)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Chat WhatsApp ${formatPhone(v.whatsapp_number, v.country_code)}`}
                            style={{
                              color: '#25D366',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 500,
                              transition: 'color 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#128C7E')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#25D366')}
                          >
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {formatPhone(v.whatsapp_number, v.country_code)}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--sf-text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            color: 'var(--sf-text)', fontWeight: 500, fontSize: '13px',
                          }}>
                            {timeAgo(v.last_login)}
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--sf-text-muted)', fontSize: '13px' }}>
                        {formatDate(v.created_at)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && visitors.length > 0 && (
          <div className="sf-summary">
            Menampilkan {from}–{to} dari {totalCount} visitor
          </div>
        )}

        {!loading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  )
}
