'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import RichTextEditor from '@/app/components/RichTextEditor'

const BADAN_USAHA_OPTIONS = ['PT', 'CV']

function MerchantCreateContent() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [systems, setSystems] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [salesList, setSalesList] = useState<any[]>([])
  const [refLoaded, setRefLoaded] = useState(false)

  const [formData, setFormData] = useState({
    nama: '',
    slug: '',
    harga: '',
    harga_coret: '',
    category_id: '',
    outlet_type_id: '',
    system_id: '',
    model_id: '',
    tahun_berdiri: '',
    total_outlet: '',
    luas_bangunan_min: '',
    bep: '',
    badan_usaha: '',
    sales_id: '',
    video_url: '',
    deskripsi_merchant: '',
    is_verified: false,
    is_recommend: false,
  })

  const loadReferenceData = useCallback(async () => {
    if (refLoaded) return
    const [catRes, sysRes, modRes, typRes, salesRes] = await Promise.all([
      supabase.from('franchise_categories').select('id, name').order('name', { ascending: true }),
      supabase.from('franchise_system').select('id, nama').order('nama', { ascending: true }),
      supabase.from('franchise_model').select('id, nama').order('nama', { ascending: true }),
      supabase.from('franchise_type_outlet').select('id, nama').order('nama', { ascending: true }),
      supabase.from('franchise_merchant_sales').select('id, nama').order('nama', { ascending: true }),
    ])
    if (catRes.data) setCategories(catRes.data)
    if (sysRes.data) setSystems(sysRes.data)
    if (modRes.data) setModels(modRes.data)
    if (typRes.data) setTypes(typRes.data)
    if (salesRes.data) setSalesList(salesRes.data)
    setRefLoaded(true)
  }, [refLoaded])

  // Load reference data on mount
  useState(() => { loadReferenceData() })

  const showToast = (message: string, isError = false) => {
    setToast({ message, type: isError ? 'error' : 'success' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.nama.trim()) {
      showToast('Nama merchant wajib diisi', true)
      return
    }

    setSaving(true)

    const payload = {
      nama: formData.nama.trim(),
      slug: formData.slug.trim() || null,
      harga: formData.harga !== '' ? Number(formData.harga) : null,
      harga_coret: formData.harga_coret !== '' ? Number(formData.harga_coret) : null,
      category_id: formData.category_id || null,
      outlet_type_id: formData.outlet_type_id || null,
      system_id: formData.system_id || null,
      model_id: formData.model_id || null,
      tahun_berdiri: formData.tahun_berdiri !== '' ? Number(formData.tahun_berdiri) : null,
      total_outlet: formData.total_outlet !== '' ? Number(formData.total_outlet) : null,
      luas_bangunan_min: formData.luas_bangunan_min !== '' ? Number(formData.luas_bangunan_min) : null,
      bep: formData.bep || null,
      badan_usaha: formData.badan_usaha || null,
      sales_id: formData.sales_id !== '' ? Number(formData.sales_id) : null,
      deskripsi_merchant: formData.deskripsi_merchant || null,
      video_url: formData.video_url || null,
      is_verified: formData.is_verified,
      is_recommend: formData.is_recommend,
    }

    const { data, error } = await supabase
      .from('franchise_merchant')
      .insert(payload)
      .select('id')
      .single()

    setSaving(false)

    if (error) {
      showToast(error.message, true)
      return
    }

    showToast('Merchant berhasil dibuat!')
    setTimeout(() => {
      router.push(`/merchant-edit?id=${data.id}`)
    }, 800)
  }

  return (
    <>
      {/* Header */}
      <div className="sf-page-header" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: 'none' }}>
        <div className="sf-page-header-left">
          <div>
            <h1 style={{ fontSize: '22px' }}>Tambah Merchant Baru</h1>
            <p className="sf-page-meta">Isi data dasar merchant, lalu tambahkan foto dan detail lainnya di halaman Edit.</p>
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
        </div>
      </div>

      {/* Section 1: Identitas & Harga */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Identitas Merchant</h3>
          <p>Nama, slug URL, dan informasi harga investasi</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-form-grid">
            <div className="sf-field sf-field-full">
              <label className="sf-label">Nama Merchant <span style={{ color: '#FF3B30' }}>*</span></label>
              <input className="sf-input" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Nama brand franchise..." />
            </div>

            <div className="sf-field sf-field-full">
              <label className="sf-label">Slug URL</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '13px', color: '#9CA3AF', pointerEvents: 'none', userSelect: 'none'
                }}>
                  /franchise/
                </span>
                <input
                  className="sf-input"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="nama-merchant-anda"
                  style={{ paddingLeft: '80px' }}
                />
              </div>
              <span style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                Harus unik. Gunakan huruf kecil dan tanda hubung, tanpa spasi.
              </span>
            </div>

            <div className="sf-field">
              <label className="sf-label">Harga Investasi (Rp)</label>
              <input className="sf-input" type="number" name="harga" value={formData.harga} onChange={handleInputChange} placeholder="0" min="0" />
            </div>
            <div className="sf-field">
              <label className="sf-label">Harga Coret (Rp)</label>
              <input className="sf-input" type="number" name="harga_coret" value={formData.harga_coret} onChange={handleInputChange} placeholder="0" min="0" />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Klasifikasi */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Klasifikasi Franchise</h3>
          <p>Kategori, sistem, model, dan tipe outlet</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-form-grid">
            <div className="sf-field">
              <label className="sf-label">Kategori</label>
              <select className="sf-select" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                <option value="">Pilih Kategori...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label className="sf-label">Tipe Outlet</label>
              <select className="sf-select" name="outlet_type_id" value={formData.outlet_type_id} onChange={handleInputChange}>
                <option value="">Pilih Tipe Outlet...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label className="sf-label">Franchise System</label>
              <select className="sf-select" name="system_id" value={formData.system_id} onChange={handleInputChange}>
                <option value="">Pilih System...</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label className="sf-label">Franchise Model</label>
              <select className="sf-select" name="model_id" value={formData.model_id} onChange={handleInputChange}>
                <option value="">Pilih Model...</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Data Bisnis */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Data Bisnis</h3>
          <p>Informasi operasional dan legalitas merchant</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-form-grid">
            <div className="sf-field">
              <label className="sf-label">Tahun Berdiri</label>
              <input className="sf-input" type="number" name="tahun_berdiri" value={formData.tahun_berdiri} onChange={handleInputChange} placeholder="2020" min="1900" max="2099" />
            </div>
            <div className="sf-field">
              <label className="sf-label">Total Outlet</label>
              <input className="sf-input" type="number" name="total_outlet" value={formData.total_outlet} onChange={handleInputChange} placeholder="Jumlah outlet saat ini" min="0" />
            </div>
            <div className="sf-field">
              <label className="sf-label">Luas Bangunan Minimum (m²)</label>
              <input className="sf-input" type="number" name="luas_bangunan_min" value={formData.luas_bangunan_min} onChange={handleInputChange} placeholder="15" min="0" />
            </div>
            <div className="sf-field">
              <label className="sf-label">BEP (Break Even Point)</label>
              <input className="sf-input" type="text" name="bep" value={formData.bep} onChange={handleInputChange} placeholder="Contoh: 12-18 Bulan" />
            </div>
            <div className="sf-field">
              <label className="sf-label">Badan Usaha</label>
              <select className="sf-select" name="badan_usaha" value={formData.badan_usaha} onChange={handleInputChange}>
                <option value="">Pilih Badan Usaha...</option>
                {BADAN_USAHA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label className="sf-label">Sales PIC</label>
              <select className="sf-select" name="sales_id" value={formData.sales_id} onChange={handleInputChange}>
                <option value="">Pilih Sales...</option>
                {salesList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Konten & Media */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Konten & Media</h3>
          <p>Video profil dan deskripsi lengkap merchant</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-form-grid">
            <div className="sf-field sf-field-full">
              <label className="sf-label">Video URL (Youtube)</label>
              <input className="sf-input" type="url" name="video_url" value={formData.video_url} onChange={handleInputChange} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="sf-field sf-field-full">
              <label className="sf-label">Deskripsi Merchant</label>
              <RichTextEditor
                value={formData.deskripsi_merchant}
                onChange={(html) => setFormData(prev => ({ ...prev, deskripsi_merchant: html }))}
                placeholder="Deskripsikan franchise ini..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Status & Visibilitas */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Status & Visibilitas</h3>
          <p>Kontrol badge dan rekomendasi yang tampil di listing</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-toggle-row">
            <div className="sf-toggle-meta">
              <h4>Verified</h4>
              <p>Tampilkan badge Verified biru pada merchant ini</p>
            </div>
            <label className="sf-toggle">
              <input type="checkbox" name="is_verified" checked={formData.is_verified} onChange={handleInputChange} />
              <div className="sf-toggle-track"><div className="sf-toggle-thumb" /></div>
            </label>
          </div>
          <div className="sf-toggle-row">
            <div className="sf-toggle-meta">
              <h4>Rekomendasi</h4>
              <p>Tandai sebagai merchant yang direkomendasikan di halaman utama</p>
            </div>
            <label className="sf-toggle">
              <input type="checkbox" name="is_recommend" checked={formData.is_recommend} onChange={handleInputChange} />
              <div className="sf-toggle-track"><div className="sf-toggle-thumb" /></div>
            </label>
          </div>
        </div>
        <div className="sf-section-footer">
          <button className="sf-btn sf-btn-primary" onClick={handleSubmit} disabled={saving}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {saving ? 'Menyimpan...' : 'Buat Merchant'}
          </button>
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default function MerchantCreatePage() {
  return (
    <Suspense fallback={
      <div className="sf-state">
        <div className="sf-skeleton-block" style={{ width: '200px', height: '24px', margin: '0 auto 16px' }} />
        <div className="sf-skeleton-block" style={{ width: '300px', height: '14px', margin: '0 auto' }} />
      </div>
    }>
      <MerchantCreateContent />
    </Suspense>
  )
}
