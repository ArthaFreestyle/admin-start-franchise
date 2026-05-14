'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatIDR, formatDate, resolveImg } from '@/lib/utils'

const PAGE_SIZE = 20

interface FranchiseMerchant {
  id: number
  nama: string
  harga: number | null
  harga_coret: number | null
  thumbnail: string | null
  is_verified: boolean
  is_recommend: boolean
  tahun_berdiri: string | null
  created_at: string | null
  franchise_categories: { name: string }[] | { name: string } | null
}

/* ── Badge helpers ─────────────────────────────────────────── */

function BadgeVerified({ value }: { value: boolean }) {
  return value ? (
    <span className="sf-badge sf-badge-verified">&#10003; Verified</span>
  ) : (
    <span className="sf-badge sf-badge-no">Belum</span>
  )
}

function BadgeRecommend({ value }: { value: boolean }) {
  return value ? (
    <span className="sf-badge sf-badge-recommend">&#9733; Rekomendasi</span>
  ) : (
    <span className="sf-badge sf-badge-no">-</span>
  )
}

/* ── Thumbnail cell ────────────────────────────────────────── */

function ThumbnailCell({ url }: { url: string | null }) {
  const resolved = resolveImg(url)
  const [failed, setFailed] = useState(false)

  if (!resolved || failed) {
    return (
      <div className="sf-thumb-placeholder">
        <svg width="20" height="20" fill="none" stroke="#D6ECFF" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="sf-thumb"
        src={resolved}
        alt="thumbnail"
        loading="lazy"
        onError={() => setFailed(true)}
        style={failed ? { display: 'none' } : undefined}
      />
      {failed && (
        <div className="sf-thumb-placeholder">
          <svg width="20" height="20" fill="none" stroke="#D6ECFF" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
    </>
  )
}

/* ── Skeleton rows ─────────────────────────────────────────── */

function SkeletonRows({ count = 5 }: { count?: number }) {
  const widths = [
    [120, 80, 90, 60, 70, 70, 90, 160],
    [140, 70, 85, 55, 70, 70, 90, 160],
    [100, 90, 95, 60, 70, 70, 90, 160],
    [130, 75, 88, 58, 70, 70, 90, 160],
    [110, 85, 92, 62, 70, 70, 90, 160],
  ]

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const w = widths[i % widths.length]
        return (
          <tr key={i} className="sf-skeleton-row">
            <td><div className="sf-skeleton-img" /></td>
            {w.map((width, j) => (
              <td key={j}><div className="sf-skeleton-block" style={{ width }} /></td>
            ))}
          </tr>
        )
      })}
    </>
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

/* ── Main page component ───────────────────────────────────── */

export default function MerchantDashboardPage() {
  const [merchants, setMerchants] = useState<FranchiseMerchant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [authed, setAuthed] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard — check sessionStorage, then load data
  useEffect(() => {
    if (!sessionStorage.getItem('sf_user')) {
      window.location.replace('/login')
      return
    }
    setAuthed(true)
  }, [])

  const loadMerchants = useCallback(async (page: number, query: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('franchise_merchant')
      .select(
        'id, nama, harga, harga_coret, thumbnail, is_verified, is_recommend, tahun_berdiri, created_at, franchise_categories(name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (query) {
      q = q.ilike('nama', `%${query}%`)
    }

    const { data, count, error: err } = await q

    if (err) {
      console.error('[Supabase error]', err)
      setError(err.message)
      setMerchants([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    console.log('[Supabase data]', { rows: data?.length, count })
    setMerchants((data as unknown as FranchiseMerchant[]) || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [])

  // Only load data once authed
  useEffect(() => {
    if (authed) {
      loadMerchants(1, '')
    }
  }, [authed, loadMerchants])

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        loadMerchants(1, value.trim())
      }, 350)
    },
    [loadMerchants]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const totalPages = Math.ceil(totalCount / PAGE_SIZE)
      if (page < 1 || page > totalPages) return
      loadMerchants(page, searchQuery)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [loadMerchants, searchQuery, totalCount]
  )

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = (currentPage - 1) * PAGE_SIZE + merchants.length

  return (
    <>
      {/* Header */}
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Dashboard <span>Merchant</span>
          </h1>
        </div>
        <div className="sf-search-wrap">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sf-search"
            id="sf-search"
            placeholder="Cari nama merchant..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table card */}
      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Tahun Berdiri</th>
                <th>Verified</th>
                <th>Rekomendasi</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="sf-tbody">
              {loading ? (
                <SkeletonRows count={5} />
              ) : error ? (
                <tr>
                  <td colSpan={9}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Tidak ada merchant</h3>
                      <p>Belum ada data merchant yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                merchants.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <ThumbnailCell url={m.thumbnail} />
                    </td>
                    <td>
                      <div className="sf-merchant-name">{m.nama}</div>
                    </td>
                    <td>{Array.isArray(m.franchise_categories) ? m.franchise_categories[0]?.name || '-' : m.franchise_categories?.name || '-'}</td>
                    <td>
                      <span className="sf-price">{formatIDR(m.harga)}</span>
                      {m.harga_coret && (
                        <span className="sf-price-coret">{formatIDR(m.harga_coret)}</span>
                      )}
                    </td>
                    <td>{m.tahun_berdiri || '-'}</td>
                    <td>
                      <BadgeVerified value={m.is_verified} />
                    </td>
                    <td>
                      <BadgeRecommend value={m.is_recommend} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--sf-text-muted)' }}>
                      {formatDate(m.created_at)}
                    </td>
                    <td>
                      <div className="sf-actions">
                        <Link className="sf-btn sf-btn-detail" href={`/merchant-detail?id=${m.id}`}>
                          Detail
                        </Link>
                        <Link className="sf-btn sf-btn-edit" href={`/merchant-edit?id=${m.id}`}>
                          Edit
                        </Link>
                        <Link className="sf-btn sf-btn-hapus" href={`/merchant-delete?id=${m.id}`}>
                          Hapus
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {!loading && !error && merchants.length > 0 && (
          <div className="sf-summary" id="sf-summary">
            Menampilkan {from}–{to} dari {totalCount} merchant
          </div>
        )}

        {/* Pagination */}
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
