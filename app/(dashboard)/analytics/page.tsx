'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

const PAGE_SIZE = 20

interface AnalyticsLike {
  id: number
  created_at: string
  visitor_id: string
  franchise_merchant: { nama: string } | null
  website_visitors: {
    email: string
    full_name: string | null
    whatsapp_number: string
    country_code: string
  } | null
}

interface MerchantOption {
  id: number
  nama: string
}

/* ── Skeleton rows ─────────────────────────────────────────── */

function SkeletonRows({ count = 5 }: { count?: number }) {
  const widths = [
    [120, 160, 140, 100, 100],
    [140, 140, 150, 90, 100],
    [100, 150, 130, 110, 100],
    [130, 140, 140, 95, 100],
    [110, 150, 145, 105, 100],
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
    <div className="sf-pagination" id="sf-pagination">
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

/* ── Helper for WhatsApp ───────────────────────────────────── */
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

/* ── Main page component ───────────────────────────────────── */

export default function AnalyticsPage() {
  const [likes, setLikes] = useState<AnalyticsLike[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('all')
  const [merchantsList, setMerchantsList] = useState<MerchantOption[]>([])
  
  // Charts State
  const [topMerchantsData, setTopMerchantsData] = useState<{ name: string; likes: number }[]>([])
  const [likesOverTimeData, setLikesOverTimeData] = useState<{ date: string; likes: number }[]>([])

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

  // ── Load Charts & Dropdown Data ──
  const loadChartData = useCallback(async (merchantId: string) => {
    try {
      // 1. Fetch dropdown merchants if empty
      if (merchantsList.length === 0) {
        const { data: mData } = await supabase
          .from('franchise_merchant')
          .select('id, nama')
          .order('nama')
        if (mData) setMerchantsList(mData)
      }

      // 2. Fetch Top Merchants (overall)
      // Only need to fetch this once, it's not affected by merchant filter
      if (merchantId === 'all' && topMerchantsData.length === 0) {
        const { data: tmData } = await supabase
          .from('franchise_merchant')
          .select('id, nama, likes(count)')
        
        if (tmData) {
          const formatted = tmData
            .map((m: any) => ({
              name: m.nama,
              likes: m.likes[0]?.count || 0,
            }))
            .filter((m) => m.likes > 0)
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 10) // Top 10
          setTopMerchantsData(formatted)
        }
      }

      // 3. Fetch Likes Over Time
      let likesQuery = supabase.from('likes').select('created_at').order('created_at')
      if (merchantId !== 'all') {
        likesQuery = likesQuery.eq('merchant_id', parseInt(merchantId))
      }
      
      const { data: timesData } = await likesQuery
      
      if (timesData) {
        const aggregated: Record<string, number> = {}
        timesData.forEach((row) => {
          const date = new Date(row.created_at).toISOString().split('T')[0]
          aggregated[date] = (aggregated[date] || 0) + 1
        })
        
        const chartData = Object.entries(aggregated)
          .map(([date, count]) => ({ date, likes: count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setLikesOverTimeData(chartData)
      }

    } catch (err) {
      console.error('Error loading chart data', err)
    }
  }, [merchantsList.length, topMerchantsData.length])

  // ── Load Table Data ──
  const loadLikes = useCallback(async (page: number, query: string, merchantId: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('likes')
      .select(`
        id, 
        created_at, 
        visitor_id,
        franchise_merchant(nama),
        website_visitors(email, full_name, whatsapp_number, country_code)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (query) {
      q = q.ilike('visitor_id', `%${query}%`)
    }
    if (merchantId !== 'all') {
      q = q.eq('merchant_id', parseInt(merchantId))
    }

    const { data, count, error: err } = await q

    if (err) {
      console.error('[Supabase error]', err)
      setError(err.message)
      setLikes([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLikes((data as unknown as AnalyticsLike[]) || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) {
      loadChartData(selectedMerchantId)
      loadLikes(1, searchQuery, selectedMerchantId)
    }
  }, [authed, selectedMerchantId, loadChartData, loadLikes]) // Removed searchQuery from dependency to avoid loop, handled in handleSearch

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        loadLikes(1, value.trim(), selectedMerchantId)
      }, 350)
    },
    [loadLikes, selectedMerchantId]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const totalPages = Math.ceil(totalCount / PAGE_SIZE)
      if (page < 1 || page > totalPages) return
      loadLikes(page, searchQuery, selectedMerchantId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [loadLikes, searchQuery, selectedMerchantId, totalCount]
  )

  const handleMerchantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMerchantId(e.target.value)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = (currentPage - 1) * PAGE_SIZE + likes.length

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Analytics <span>Likes</span>
          </h1>
        </div>
        <div className="sf-header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            className="sf-input" 
            style={{ padding: '8px 12px', minWidth: '200px' }}
            value={selectedMerchantId}
            onChange={handleMerchantChange}
          >
            <option value="all">Semua Merchant</option>
            {merchantsList.map(m => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
          
          <div className="sf-search-wrap" style={{ margin: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sf-search"
              placeholder="Cari email visitor..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Top Merchants Chart */}
        {selectedMerchantId === 'all' && (
          <div className="sf-card" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Top 10 Merchants (Likes)</h3>
            <div style={{ width: '100%', height: 300 }}>
              {topMerchantsData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={topMerchantsData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="likes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Belum ada data likes.</div>
              )}
            </div>
          </div>
        )}

        {/* Likes Over Time Chart */}
        <div className="sf-card" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Tren Likes Harian</h3>
          <div style={{ width: '100%', height: 300 }}>
            {likesOverTimeData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={likesOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label) => formatDate(new Date(label).toISOString())}
                  />
                  <Line type="monotone" dataKey="likes" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Belum ada data tren likes.</div>
            )}
          </div>
        </div>
      </div>

      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk / Merchant</th>
                <th>Visitor</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Tanggal Like</th>
                <th>Aksi</th>
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
              ) : likes.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Belum ada data likes</h3>
                      <p>Belum ada user yang me-like produk untuk filter ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                likes.map((like) => {
                  const product = like.franchise_merchant?.nama || 'Unknown Product'
                  const visitor = like.website_visitors
                  const name = visitor?.full_name || '-'
                  const email = visitor?.email || like.visitor_id
                  const wa = visitor?.whatsapp_number
                  const cc = visitor?.country_code
                  
                  return (
                    <tr key={like.id}>
                      <td>
                        <div className="sf-merchant-name">{product}</div>
                      </td>
                      <td>{name}</td>
                      <td>{email}</td>
                      <td>{wa ? `${cc || '62'}${wa.startsWith('0') ? wa.substring(1) : wa}` : '-'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--sf-text-muted)' }}>
                        {formatDate(like.created_at)}
                      </td>
                      <td>
                        <div className="sf-actions">
                          {wa ? (
                            <a 
                              href={getWaLink(wa, cc || '62')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sf-btn"
                              style={{ backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }}
                              title="Follow up via WhatsApp"
                            >
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                              </svg>
                              Follow up
                            </a>
                          ) : (
                            <span className="sf-badge sf-badge-no">No WA</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && likes.length > 0 && (
          <div className="sf-summary">
            Menampilkan {from}–{to} dari {totalCount} data
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
