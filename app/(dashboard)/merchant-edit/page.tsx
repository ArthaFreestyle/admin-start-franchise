'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import RichTextEditor from '@/app/components/RichTextEditor'
import { resolveImg } from '@/lib/utils'

const BUCKET = 'Start Franchise Bucket'

const BADAN_USAHA_OPTIONS = ['PT', 'CV']

function convertToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context tidak tersedia'))
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Gagal mengkonversi gambar ke WebP'))
          const baseName = file.name.replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }))
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Gagal membaca file gambar'))
    }

    img.src = objectUrl
  })
}

function MerchantEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [authed, setAuthed] = useState(false)

  const [categories, setCategories] = useState<any[]>([])
  const [systems, setSystems] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [salesList, setSalesList] = useState<any[]>([])

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
    thumbnail: '',
    logo: '',
    data_confirmed_at: null as string | null,
  })

  const [support, setSupport] = useState<any[]>([])
  const [keunggulan, setKeunggulan] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])

  const [newSupport, setNewSupport] = useState('')
  const [newKeunggulan, setNewKeunggulan] = useState('')

  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sessionStorage.getItem('sf_user')) {
      window.location.replace('/login')
      return
    }
    setAuthed(true)
  }, [])

  const loadReferenceData = async () => {
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
  }

  const loadData = useCallback(async () => {
    if (!id) {
      setError('ID Merchant tidak ditemukan di URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    await loadReferenceData()

    const { data: m, error: err } = await supabase
      .from('franchise_merchant')
      .select(`
        *,
        franchise_support_merchant ( * ),
        franchise_keunggulan_merchant ( * ),
        franchise_image_outlet ( * )
      `)
      .eq('id', id)
      .single()

    if (err || !m) {
      setError(err?.message || 'Merchant tidak ditemukan')
      setLoading(false)
      return
    }

    setFormData({
      nama: m.nama || '',
      slug: m.slug || '',
      harga: m.harga ?? '',
      harga_coret: m.harga_coret ?? '',
      category_id: m.category_id ?? '',
      outlet_type_id: m.outlet_type_id ?? '',
      system_id: m.system_id ?? '',
      model_id: m.model_id ?? '',
      tahun_berdiri: m.tahun_berdiri ?? '',
      total_outlet: m.total_outlet ?? '',
      luas_bangunan_min: m.luas_bangunan_min ?? '',
      bep: m.bep || '',
      badan_usaha: m.badan_usaha || '',
      sales_id: m.sales_id ?? '',
      video_url: m.video_url || '',
      deskripsi_merchant: m.deskripsi_merchant || '',
      is_verified: !!m.is_verified,
      is_recommend: !!m.is_recommend,
      thumbnail: m.thumbnail || '',
      logo: m.logo || '',
      data_confirmed_at: m.data_confirmed_at,
    })

    setSupport(m.franchise_support_merchant || [])
    setKeunggulan(m.franchise_keunggulan_merchant || [])
    setPhotos(m.franchise_image_outlet || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (authed) loadData()
  }, [authed, loadData])

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

  const saveProfil = async () => {
    if (!formData.nama) {
      showToast('Nama merchant wajib diisi', true)
      return
    }
    setSaving(true)
    const payload = {
      nama: formData.nama,
      slug: formData.slug || null,
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

    const { error } = await supabase.from('franchise_merchant').update(payload).eq('id', id)
    setSaving(false)

    if (error) {
      showToast(error.message, true)
    } else {
      showToast('Profil berhasil disimpan')
    }
  }

  const confirmData = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('franchise_merchant').update({ data_confirmed_at: now }).eq('id', id)
    setSaving(false)

    if (error) {
      showToast(error.message, true)
    } else {
      setFormData(prev => ({ ...prev, data_confirmed_at: now }))
      showToast('Data berhasil dikonfirmasi')
    }
  }

  const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')

  const uploadToStorage = async (file: File, path: string) => {
    const ext = file.name.split('.').pop()
    const safeName = sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))
    const fullPath = `merchants/${id}/${path}/${Date.now()}_${safeName}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, { contentType: file.type })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
    return data.publicUrl
  }

  const handleSingleImageUpload = async (file: File, type: 'thumbnail' | 'logo') => {
    if (type === 'thumbnail') setUploadingThumb(true)
    else setUploadingLogo(true)

    try {
      const converted = await convertToWebP(file)
      const url = await uploadToStorage(converted, type)
      const { error } = await supabase.from('franchise_merchant').update({ [type]: url }).eq('id', id)
      if (error) throw error

      setFormData(prev => ({ ...prev, [type]: url }))
      showToast(`${type === 'thumbnail' ? 'Thumbnail' : 'Logo'} berhasil diperbarui`)
    } catch (err: any) {
      showToast(err.message, true)
    } finally {
      if (type === 'thumbnail') setUploadingThumb(false)
      else setUploadingLogo(false)
    }
  }

  const handlePhotosUpload = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    setUploadingPhotos(true)
    showToast(`Mengupload ${imageFiles.length} foto...`)

    let newPhotos: any[] = []

    for (const file of imageFiles) {
      try {
        const converted = await convertToWebP(file)
        const url = await uploadToStorage(converted, 'outlet_photos')
        const { data, error } = await supabase
          .from('franchise_image_outlet')
          .insert({ merchant_id: parseInt(id!), image_url: url })
          .select('id, image_url')
          .single()

        if (!error && data) newPhotos.push(data)
      } catch (err: any) {
        console.error('Failed to upload photo:', err.message)
      }
    }

    setPhotos(prev => [...prev, ...newPhotos])
    setUploadingPhotos(false)
    showToast(`${newPhotos.length} foto berhasil diupload`)
  }

  const deletePhoto = async (photoId: number) => {
    const { error } = await supabase.from('franchise_image_outlet').delete().eq('id', photoId)
    if (error) {
      showToast(error.message, true)
    } else {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      showToast('Foto dihapus')
    }
  }

  const addSupport = async () => {
    if (!newSupport.trim()) return
    const payload = { merchant_id: parseInt(id!), nama: newSupport.trim() }
    const { data, error } = await supabase.from('franchise_support_merchant').insert(payload).select('id, nama').single()

    if (error) showToast(error.message, true)
    else {
      setSupport(prev => [...prev, data])
      setNewSupport('')
    }
  }

  const deleteSupport = async (supId: number) => {
    const { error } = await supabase.from('franchise_support_merchant').delete().eq('id', supId)
    if (error) showToast(error.message, true)
    else setSupport(prev => prev.filter(s => s.id !== supId))
  }

  const addKeunggulan = async () => {
    if (!newKeunggulan.trim()) return
    const payload = { merchant_id: parseInt(id!), nama: newKeunggulan.trim() }
    const { data, error } = await supabase.from('franchise_keunggulan_merchant').insert(payload).select('id, nama').single()

    if (error) showToast(error.message, true)
    else {
      setKeunggulan(prev => [...prev, data])
      setNewKeunggulan('')
    }
  }

  const deleteKeunggulan = async (keuId: number) => {
    const { error } = await supabase.from('franchise_keunggulan_merchant').delete().eq('id', keuId)
    if (error) showToast(error.message, true)
    else setKeunggulan(prev => prev.filter(k => k.id !== keuId))
  }

  if (!authed) return null

  if (loading) {
    return (
      <div className="sf-state">
        <div className="sf-skeleton-block" style={{ width: '200px', height: '24px', margin: '0 auto 16px' }} />
        <div className="sf-skeleton-block" style={{ width: '300px', height: '14px', margin: '0 auto' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="sf-state sf-state-error">
        <div className="sf-state-icon">&#9888;</div>
        <h3>Gagal memuat merchant</h3>
        <p>{error}</p>
        <button className="sf-btn sf-btn-ghost" onClick={() => router.push('/merchant-dashboard')} style={{ marginTop: '16px' }}>
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="sf-page-header" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: 'none' }}>
        <div className="sf-page-header-left">
          <div>
            <h1 style={{ fontSize: '22px' }}>Edit Merchant</h1>
            <p className="sf-page-meta">ID: {id} &nbsp;·&nbsp; {formData.nama}</p>
          </div>
        </div>
        <div className="sf-page-header-actions">
          <button className="sf-btn sf-btn-back" onClick={() => router.push(`/merchant-detail?id=${id}`)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali
          </button>
        </div>
      </div>

      {formData.data_confirmed_at && (
        <div className="sf-confirmed-badge" style={{ marginBottom: '20px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Data telah dikonfirmasi pada {new Date(formData.data_confirmed_at).toLocaleDateString('id-ID')}
        </div>
      )}

      {/* ── SECTION 1: Identitas & Harga ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Identitas Merchant</h3>
          <p>Nama, slug URL, dan informasi harga investasi</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-form-grid">
            {/* Nama */}
            <div className="sf-field sf-field-full">
              <label className="sf-label">Nama Merchant <span style={{ color: '#FF3B30' }}>*</span></label>
              <input className="sf-input" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Nama brand franchise..." />
            </div>

            {/* Slug */}
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

            {/* Harga */}
            <div className="sf-field">
              <label className="sf-label">Harga Investasi (Rp)</label>
              <input className="sf-input" type="number" name="harga" value={formData.harga} onChange={handleInputChange} placeholder="0" min="0" />
            </div>
            <div className="sf-field">
              <label className="sf-label">Harga Coret (Rp)</label>
              <input className="sf-input" type="number" name="harga_coret" value={formData.harga_coret} onChange={handleInputChange} placeholder="0" min="0" />
              <span style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>Harga asli sebelum diskon, ditampilkan dengan strikethrough</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Klasifikasi ── */}
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

      {/* ── SECTION 3: Data Bisnis ── */}
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
                {BADAN_USAHA_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
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

      {/* ── SECTION 4: Konten & Media ── */}
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

      {/* ── SECTION 5: Status & Visibilitas ── */}
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
          <button className="sf-btn sf-btn-primary" onClick={saveProfil} disabled={saving}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>
        </div>
      </section>

      {/* ── SECTION 6: Gambar Merchant ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Gambar Merchant</h3>
          <p>Thumbnail dan logo yang tampil di halaman listing</p>
        </div>
        <div className="sf-section-body">
          <div className="sf-field" style={{ marginBottom: '24px' }}>
            <label className="sf-label">Thumbnail</label>
            <div className="sf-img-row">
              <div className="sf-img-box" style={{ width: '96px', height: '64px', borderRadius: '10px', flexShrink: 0 }}>
                {formData.thumbnail ? (
                  <img src={resolveImg(formData.thumbnail)} alt="Thumbnail" />
                ) : (
                  <svg width="26" height="26" fill="none" stroke="#C7C7CC" strokeWidth="1.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <div className="sf-img-upload-area">
                <input
                  type="file"
                  ref={thumbInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleSingleImageUpload(e.target.files[0], 'thumbnail')
                  }}
                />
                <button className="sf-btn-outline-sm" onClick={() => thumbInputRef.current?.click()} disabled={uploadingThumb}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploadingThumb ? 'Mengupload...' : 'Upload Thumbnail'}
                </button>
                <span style={{ fontSize: '11.5px', color: '#9CA3AF' }}>Rekomendasi: 16:9, maks 2MB</span>
              </div>
            </div>
          </div>

          <div className="sf-field">
            <label className="sf-label">Logo</label>
            <div className="sf-img-row">
              <div className="sf-img-box" style={{ borderRadius: '50%', flexShrink: 0 }}>
                {formData.logo ? (
                  <img src={resolveImg(formData.logo)} alt="Logo" />
                ) : (
                  <svg width="26" height="26" fill="none" stroke="#C7C7CC" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                )}
              </div>
              <div className="sf-img-upload-area">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleSingleImageUpload(e.target.files[0], 'logo')
                  }}
                />
                <button className="sf-btn-outline-sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploadingLogo ? 'Mengupload...' : 'Upload Logo'}
                </button>
                <span style={{ fontSize: '11.5px', color: '#9CA3AF' }}>Rekomendasi: 1:1, maks 1MB</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: Foto Outlet ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Foto Outlet</h3>
          <p>Galeri foto outlet yang ditampilkan ke calon franchisee</p>
        </div>
        <div className="sf-section-body">
          <input
            type="file"
            ref={photosInputRef}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) handlePhotosUpload(e.target.files)
            }}
          />
          <div
            className="sf-upload-zone"
            onClick={() => !uploadingPhotos && photosInputRef.current?.click()}
            style={uploadingPhotos ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <div className="sf-upload-icon">
              <svg width="20" height="20" fill="none" stroke="#099dff" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p><strong>{uploadingPhotos ? 'Sedang mengupload...' : 'Klik untuk upload'}</strong>{!uploadingPhotos && ' atau drag & drop'}</p>
            <small>PNG, JPG, WEBP — bisa pilih beberapa sekaligus</small>
          </div>

          {photos.length > 0 && (
            <div className="sf-photo-grid">
              {photos.map(p => {
                const url = resolveImg(p.image_url || p.foto_url || p.url)
                if (!url) return null
                return (
                  <div className="sf-photo-item" key={p.id} style={{ position: 'relative' }}>
                    <img src={url} alt="Outlet" />
                    <button
                      className="sf-photo-del"
                      onClick={() => deletePhoto(p.id)}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(255,59,48,0.9)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 8: Support Merchant ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Support Merchant</h3>
          <p>Dukungan yang diberikan kepada setiap franchisee</p>
        </div>
        <div className="sf-section-body">
          {support.length === 0 && (
            <p style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '12px' }}>Belum ada data support.</p>
          )}
          {support.map(s => (
            <div className="sf-list-item" key={s.id}>
              <span className="sf-list-item-text">{s.nama || s.support || s.keterangan}</span>
              <button className="sf-list-del" onClick={() => deleteSupport(s.id)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <div className="sf-add-row">
            <input
              className="sf-input"
              type="text"
              placeholder="Contoh: Pelatihan awal 3 hari..."
              value={newSupport}
              onChange={(e) => setNewSupport(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSupport()}
            />
            <button className="sf-btn sf-btn-primary" onClick={addSupport} style={{ whiteSpace: 'nowrap' }}>Tambah</button>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: Keunggulan ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Keunggulan Merchant</h3>
          <p>Poin-poin keunggulan franchise dibanding kompetitor</p>
        </div>
        <div className="sf-section-body">
          {keunggulan.length === 0 && (
            <p style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '12px' }}>Belum ada data keunggulan.</p>
          )}
          {keunggulan.map(k => (
            <div className="sf-list-item" key={k.id}>
              <span className="sf-list-item-text">{k.nama || k.keunggulan || k.keterangan}</span>
              <button className="sf-list-del" onClick={() => deleteKeunggulan(k.id)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <div className="sf-add-row">
            <input
              className="sf-input"
              type="text"
              placeholder="Contoh: BEP cepat, Brand kuat..."
              value={newKeunggulan}
              onChange={(e) => setNewKeunggulan(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeunggulan()}
            />
            <button className="sf-btn sf-btn-primary" onClick={addKeunggulan} style={{ whiteSpace: 'nowrap' }}>Tambah</button>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: Konfirmasi Data ── */}
      <section className="sf-section" style={{ marginBottom: '16px' }}>
        <div className="sf-section-header">
          <h3>Konfirmasi Data</h3>
          <p>Konfirmasikan bahwa seluruh data di atas sudah benar dan lengkap</p>
        </div>
        <div className="sf-section-body">
          <button className="sf-btn-confirm" onClick={confirmData} disabled={saving}>
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Data saya sudah benar dan lengkap
          </button>
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

export default function MerchantEditPage() {
  return (
    <Suspense fallback={
      <div className="sf-state">
        <div className="sf-skeleton-block" style={{ width: '200px', height: '24px', margin: '0 auto 16px' }} />
        <div className="sf-skeleton-block" style={{ width: '300px', height: '14px', margin: '0 auto' }} />
      </div>
    }>
      <MerchantEditContent />
    </Suspense>
  )
}
