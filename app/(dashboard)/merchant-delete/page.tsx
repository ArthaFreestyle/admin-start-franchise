'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'

function MerchantDeleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState({ support: 0, keunggulan: 0, photos: 0 })

  const [confirmName, setConfirmName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadData = useCallback(async () => {
    if (!id) {
      setError('ID Merchant tidak ditemukan di URL.')
      setLoading(false)
      return
    }

    setLoading(true)

    // Load merchant
    const { data: m, error: err } = await supabase
      .from('franchise_merchant')
      .select('id, nama, created_at')
      .eq('id', id)
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    if (!m) {
      setError('Merchant tidak ditemukan.')
      setLoading(false)
      return
    }

    setData(m)

    // Load stats
    const [sup, keu, photo] = await Promise.all([
      supabase.from('franchise_support_merchant').select('id', { count: 'exact', head: true }).eq('merchant_id', id),
      supabase.from('franchise_keunggulan_merchant').select('id', { count: 'exact', head: true }).eq('merchant_id', id),
      supabase.from('franchise_image_outlet').select('id', { count: 'exact', head: true }).eq('merchant_id', id),
    ])

    setStats({
      support: sup.count || 0,
      keunggulan: keu.count || 0,
      photos: photo.count || 0,
    })

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async () => {
    if (!data) return

    setIsDeleting(true)

    try {
      // 1. Delete relations
      const [supDel, keuDel, photoDel] = await Promise.all([
        supabase.from('franchise_support_merchant').delete().eq('merchant_id', data.id),
        supabase.from('franchise_keunggulan_merchant').delete().eq('merchant_id', data.id),
        supabase.from('franchise_image_outlet').delete().eq('merchant_id', data.id),
      ])

      if (supDel.error) throw supDel.error
      if (keuDel.error) throw keuDel.error
      if (photoDel.error) throw photoDel.error

      // 2. Delete merchant
      const { error } = await supabase.from('franchise_merchant').delete().eq('id', data.id)
      if (error) throw error

      setIsDeleted(true)
    } catch (err: any) {
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="sf-container">
        <div className="sf-page-title">
          <div className="sf-skeleton-block" style={{ width: '200px', height: '26px', marginBottom: '9px' }} />
          <div className="sf-skeleton-block" style={{ width: '290px', height: '13px' }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="sf-container">
        <div className="sf-error-state">
          <svg width="48" height="48" fill="none" stroke="#FF3B30" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="#FF3B30" />
          </svg>
          <h2>Merchant Tidak Ditemukan</h2>
          <p>{error || 'Data tidak ditemukan'}</p>
          <button className="sf-btn-secondary" onClick={() => router.push('/merchant-dashboard')} style={{ marginTop: '16px' }}>
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isMatch = confirmName.trim().toLowerCase() === data.nama.toLowerCase()

  if (isDeleted) {
    return (
      <div className="sf-container">
        <div className="sf-section">
          <div className="sf-section-body">
            <div className="sf-deleted-state">
              <div className="sf-deleted-icon">
                <svg width="28" height="28" fill="none" stroke="#34C759" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>Merchant Berhasil Dihapus</h3>
              <p>"{data.nama}" telah dihapus secara permanen dari sistem.</p>
              <button className="sf-btn-secondary" onClick={() => router.push('/merchant-dashboard')}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sf-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 28px' }}>
        <div className="sf-page-title">
          <h2>Hapus Merchant</h2>
          <p>Tindakan ini bersifat permanen dan tidak dapat dibatalkan</p>
        </div>

        <section className="sf-section">
          <div className="sf-section-header">
            <h3>Konfirmasi Penghapusan</h3>
            <p>Pastikan Anda memilih merchant yang tepat sebelum melanjutkan</p>
          </div>
          <div className="sf-section-body">
            
            <div className="sf-merchant-preview">
              <div className="sf-merchant-thumb">
                <svg width="24" height="24" fill="none" stroke="#C7C7CC" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div className="sf-merchant-info">
                <h4>{data.nama}</h4>
                <p>ID: {data.id} &nbsp;·&nbsp; Dibuat pada {new Date(data.created_at).toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            <div className="sf-stats-row">
              <div className="sf-stat-card">
                <div className="sf-stat-num">{stats.support}</div>
                <div className="sf-stat-label">Support</div>
              </div>
              <div className="sf-stat-card">
                <div className="sf-stat-num">{stats.keunggulan}</div>
                <div className="sf-stat-label">Keunggulan</div>
              </div>
              <div className="sf-stat-card">
                <div className="sf-stat-num">{stats.photos}</div>
                <div className="sf-stat-label">Foto Outlet</div>
              </div>
            </div>

            <div className="sf-warning-box">
              <h4>
                <svg width="15" height="15" fill="none" stroke="#C0392B" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Data yang akan dihapus secara permanen:
              </h4>
              <ul>
                <li>Profil utama merchant (nama, harga, deskripsi, gambar, dll.)</li>
                <li>Semua item Support Merchant yang terkait</li>
                <li>Semua item Keunggulan Merchant yang terkait</li>
                <li>Semua Foto Outlet yang terkait</li>
              </ul>
            </div>

            <label className="sf-confirm-label" htmlFor="inp-confirm">
              Ketik nama merchant <strong>{data.nama}</strong> untuk mengkonfirmasi penghapusan:
            </label>
            <input
              id="inp-confirm"
              type="text"
              className={`sf-input-confirm ${confirmName && !isMatch ? 'sf-invalid' : ''}`}
              placeholder="Ketik nama merchant di sini..."
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={isDeleting}
            />
            <span className="sf-input-hint">Nama harus sama persis (huruf besar/kecil tidak dibedakan)</span>

          </div>
          <div className="sf-section-footer">
            <button 
              className="sf-btn-danger" 
              onClick={handleDelete} 
              disabled={!isMatch || isDeleting}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              {isDeleting ? 'Menghapus...' : 'Hapus Merchant'}
            </button>
            <button className="sf-btn-secondary" onClick={() => router.back()} disabled={isDeleting}>
              Batal
            </button>
          </div>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default function MerchantDeletePage() {
  return (
    <Suspense fallback={
      <div className="sf-container">
        <div className="sf-page-title">
          <div className="sf-skeleton-block" style={{ width: '200px', height: '26px', marginBottom: '9px' }} />
          <div className="sf-skeleton-block" style={{ width: '290px', height: '13px' }} />
        </div>
      </div>
    }>
      <MerchantDeleteContent />
    </Suspense>
  )
}
