'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { formatIDR, formatDate, resolveImg, getYoutubeEmbedUrl } from '@/lib/utils'

function MerchantDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    if (!id) {
      setError('ID Merchant tidak ditemukan di URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data: m, error: err } = await supabase
      .from('franchise_merchant')
      .select(`
        *,
        franchise_categories ( id, name ),
        franchise_system ( id, nama ),
        franchise_model ( id, nama ),
        franchise_type_outlet ( id, nama ),
        franchise_support_merchant ( * ),
        franchise_keunggulan_merchant ( * ),
        franchise_image_outlet ( * )
      `)
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
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  if (loading) {
    return (
      <div className="sf-state">
        <div className="sf-skeleton-block" style={{ width: '200px', height: '24px', margin: '0 auto 16px' }} />
        <div className="sf-skeleton-block" style={{ width: '300px', height: '14px', margin: '0 auto' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="sf-state sf-state-error">
        <div className="sf-state-icon">&#9888;</div>
        <h3>Gagal memuat detail</h3>
        <p>{error || 'Merchant tidak ditemukan'}</p>
        <button className="sf-btn sf-btn-ghost" onClick={() => router.push('/merchant-dashboard')} style={{ marginTop: '16px' }}>
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  const m = data
  const support = m.franchise_support_merchant || []
  const keunggulan = m.franchise_keunggulan_merchant || []
  const photos = m.franchise_image_outlet || []
  const cat = m.franchise_categories
  const sys = m.franchise_system
  const mod = m.franchise_model
  const ot = m.franchise_type_outlet

  const thumbSrc = resolveImg(m.thumbnail)
  const embedUrl = getYoutubeEmbedUrl(m.video_url)

  return (
    <>
      <div className="sf-page-header">
        <div className="sf-page-header-left">
          <div className="sf-page-thumb">
            {thumbSrc && <Image src={thumbSrc} alt="Thumbnail" width={96} height={64} priority />}
          </div>
          <div>
            <h1>{m.nama}</h1>
            <div className="sf-page-badges">
              {m.is_verified && <span className="sf-badge sf-badge-verified">&#10003; Verified</span>}
              {m.is_recommend && <span className="sf-badge sf-badge-recommend">&#9733; Rekomendasi</span>}
              {m.data_confirmed_at ? (
                <span className="sf-badge sf-badge-confirmed">&#10003; Data Dikonfirmasi {formatDate(m.data_confirmed_at)}</span>
              ) : (
                <span className="sf-badge sf-badge-no">Belum Dikonfirmasi</span>
              )}
            </div>
            <div className="sf-page-meta">
              ID: {m.id} &nbsp;·&nbsp; Dibuat: {formatDate(m.created_at)}
            </div>
          </div>
        </div>
        <div className="sf-page-header-actions">
          <button className="sf-btn sf-btn-back" onClick={() => router.push('/merchant-dashboard')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali
          </button>
          <button className="sf-btn sf-btn-edit" onClick={() => router.push(`/merchant-edit?id=${m.id}`)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Merchant
          </button>
        </div>
      </div>

      <div className="sf-content-grid">
        {/* Left Column */}
        <div className="sf-col-left">
          <div className="sf-section">
            <div className="sf-section-title">Profil Utama</div>
            <div className="sf-section-body">
              <div className="sf-fields">
                <div className="sf-field">
                  <label>Harga</label>
                  <div className="sf-field-value sf-price">{formatIDR(m.harga)}</div>
                </div>
                <div className="sf-field">
                  <label>Harga Coret</label>
                  <div className="sf-field-value sf-muted">{formatIDR(m.harga_coret)}</div>
                </div>
                <div className="sf-field">
                  <label>Tahun Berdiri</label>
                  <div className="sf-field-value">{m.tahun_berdiri || '-'}</div>
                </div>
                <div className="sf-field">
                  <label>Luas Min (m²)</label>
                  <div className="sf-field-value">{m.luas_bangunan_min ? `${m.luas_bangunan_min} m²` : '-'}</div>
                </div>
                <div className="sf-field">
                  <label>BEP</label>
                  <div className="sf-field-value">{m.bep || '-'}</div>
                </div>
                <div className="sf-field">
                  <label>Badan Usaha</label>
                  <div className="sf-field-value">{m.badan_usaha || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-section">
            <div className="sf-section-title">Kategori &amp; Klasifikasi</div>
            <div className="sf-section-body">
              <div className="sf-fields">
                <div className="sf-field">
                  <label>Kategori</label>
                  <div className="sf-field-value">{cat ? cat.name : '-'}</div>
                </div>
                <div className="sf-field">
                  <label>Franchise System</label>
                  <div className="sf-field-value">{sys ? sys.nama : '-'}</div>
                </div>
                <div className="sf-field">
                  <label>Franchise Model</label>
                  <div className="sf-field-value">{mod ? mod.nama : '-'}</div>
                </div>
                <div className="sf-field">
                  <label>Tipe Outlet</label>
                  <div className="sf-field-value">{ot ? ot.nama : '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-section">
            <div className="sf-section-title">Dukungan Merchant</div>
            <div className="sf-section-body">
              {support.length > 0 ? (
                <ul className="sf-list">
                  {support.map((s: any) => (
                    <li key={s.id}>
                      <span className="sf-list-dot" />
                      <span>{s.nama}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sf-empty-list">Belum ada data support.</p>
              )}
            </div>
          </div>

          <div className="sf-section">
            <div className="sf-section-title">Keunggulan</div>
            <div className="sf-section-body">
              {keunggulan.length > 0 ? (
                <ul className="sf-list">
                  {keunggulan.map((k: any) => (
                    <li key={k.id}>
                      <span className="sf-list-dot" />
                      <span>{k.nama}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sf-empty-list">Belum ada data keunggulan.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="sf-col-right">
          <div className="sf-section">
            <div className="sf-section-title">Deskripsi &amp; Video</div>
            <div className="sf-section-body">
              {m.deskripsi_merchant ? (
                <div
                  className="sf-rich-content"
                  dangerouslySetInnerHTML={{ __html: m.deskripsi_merchant }}
                />
              ) : (
                <span className="sf-empty-list">Tidak ada deskripsi.</span>
              )}
              
              {embedUrl && (
                <div className="sf-video-wrap">
                  <iframe src={embedUrl} allowFullScreen title="Video Profil Merchant" />
                </div>
              )}
              {m.video_url && !embedUrl && (
                <a href={m.video_url} target="_blank" rel="noreferrer" className="sf-video-link">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Tonton Video Profil
                </a>
              )}
            </div>
          </div>

          <div className="sf-section">
            <div className="sf-section-title">Galeri Foto Outlet</div>
            <div className="sf-section-body">
              {photos.length > 0 ? (
                <div className="sf-photo-grid">
                  {photos.map((p: any) => {
                    const src = resolveImg(p.image_url)
                    return src ? (
                      <div className="sf-photo-item" key={p.id} style={{ position: 'relative', aspectRatio: '4/3' }}>
                        <Image src={src} alt="Foto outlet" fill style={{ objectFit: 'cover' }} />
                      </div>
                    ) : null
                  })}
                </div>
              ) : (
                <p className="sf-empty-list">Belum ada foto outlet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function MerchantDetailPage() {
  return (
    <Suspense fallback={
      <div className="sf-state">
        <div className="sf-skeleton-block" style={{ width: '200px', height: '24px', margin: '0 auto 16px' }} />
        <div className="sf-skeleton-block" style={{ width: '300px', height: '14px', margin: '0 auto' }} />
      </div>
    }>
      <MerchantDetailContent />
    </Suspense>
  )
}
