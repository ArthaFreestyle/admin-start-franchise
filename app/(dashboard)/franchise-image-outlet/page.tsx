'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'

const PAGE_SIZE = 20
const BUCKET = 'Start Franchise Bucket'

interface ImageOutletItem {
  id: number
  merchant_id: number
  image_url: string | null
}

interface Merchant {
  id: number
  nama: string
}

export default function FranchiseImageOutletPage() {
  const [items, setItems] = useState<ImageOutletItem[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [merchantMap, setMerchantMap] = useState<Record<number, string>>({})
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const [filterMerchantId, setFilterMerchantId] = useState('')

  const [addMerchantId, setAddMerchantId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(-1)
  const [uploadLabel, setUploadLabel] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editMerchantId, setEditMerchantId] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMerchants = useCallback(async () => {
    const { data } = await supabase
      .from('franchise_merchant')
      .select('id, nama')
      .order('nama', { ascending: true })

    if (data) {
      setMerchants(data)
      const map: Record<number, string> = {}
      data.forEach(m => { map[m.id] = m.nama })
      setMerchantMap(map)
    }
  }, [])

  const loadItems = useCallback(async (page: number, merchantId: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('franchise_image_outlet')
      .select('id, merchant_id, image_url', { count: 'exact' })
      .order('merchant_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (merchantId) q = q.eq('merchant_id', parseInt(merchantId))

    const { data, count, error: err } = await q

    if (err) {
      setError(err.message)
      setItems([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setItems(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMerchants().then(() => {
      loadItems(1, '')
    })
  }, [loadMerchants, loadItems])

  // Keydown for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleFilterChange = (merchantId: string) => {
    setFilterMerchantId(merchantId)
    loadItems(1, merchantId)
  }

  const handlePageChange = (page: number) => {
    loadItems(page, filterMerchantId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // File selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) {
      setToast({ message: 'Pilih file gambar (JPG, PNG, WEBP)', type: 'error' })
      return
    }
    setSelectedFiles(prev => [...prev, ...imageFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('sf-drag-over')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('sf-drag-over')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('sf-drag-over')
    handleFilesSelected(e.dataTransfer.files)
  }

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  const uploadToStorage = async (file: File, merchantId: string) => {
    const ext = file.name.split('.').pop()
    const safeName = sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))
    const path = `outlets/${merchantId}/${Date.now()}_${safeName}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!addMerchantId) {
      setToast({ message: 'Pilih merchant terlebih dahulu', type: 'error' })
      return
    }
    if (!selectedFiles.length) {
      setToast({ message: 'Pilih minimal satu foto', type: 'error' })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadLabel(`Mengupload 0 / ${selectedFiles.length} foto...`)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setUploadProgress(Math.round((i / selectedFiles.length) * 100))
      setUploadLabel(`Mengupload ${i + 1} / ${selectedFiles.length}: ${file.name}`)

      try {
        const publicUrl = await uploadToStorage(file, addMerchantId)

        const { error: dbErr } = await supabase
          .from('franchise_image_outlet')
          .insert({ merchant_id: parseInt(addMerchantId), image_url: publicUrl })

        if (dbErr) throw new Error(dbErr.message)
        successCount++
      } catch (err: any) {
        failCount++
        console.error(`Gagal upload ${file.name}:`, err.message)
      }
    }

    setUploadProgress(100)
    setUploadLabel('Selesai!')
    setTimeout(() => {
      setUploadProgress(-1)
      setIsUploading(false)
      setSelectedFiles([])
      
      if (failCount === 0) {
        setToast({ message: `${successCount} foto berhasil diupload`, type: 'success' })
      } else {
        setToast({ 
          message: `${successCount} berhasil, ${failCount} gagal`, 
          type: failCount === selectedFiles.length ? 'error' : 'success' 
        })
      }

      loadItems(currentPage, filterMerchantId)
    }, 1200)
  }

  // Edit logic
  const startEdit = (item: ImageOutletItem) => {
    setEditingId(item.id)
    setEditMerchantId(item.merchant_id.toString())
    setEditFile(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditFile(null)
  }

  const saveEdit = async (id: number, currentUrl: string | null) => {
    if (!editMerchantId) return

    setIsUploading(true)
    let imageUrl = currentUrl

    if (editFile) {
      try {
        imageUrl = await uploadToStorage(editFile, editMerchantId)
      } catch (err: any) {
        setToast({ message: `Gagal upload foto: ${err.message}`, type: 'error' })
        setIsUploading(false)
        return
      }
    }

    const { error: err } = await supabase
      .from('franchise_image_outlet')
      .update({ image_url: imageUrl, merchant_id: parseInt(editMerchantId) })
      .eq('id', id)

    setIsUploading(false)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setEditFile(null)
    setToast({ message: 'Foto berhasil diperbarui', type: 'success' })
    loadItems(currentPage, filterMerchantId)
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_image_outlet')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null })
    setToast({ message: 'Foto berhasil dihapus', type: 'success' })
    loadItems(currentPage, filterMerchantId)
  }

  const getFilenameFromUrl = (url: string | null) => {
    if (!url) return '—'
    try {
      return decodeURIComponent(url.split('/').pop()?.split('?')[0] || '')
    } catch {
      return url
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null

    const pages = [1]
    if (currentPage > 4) pages.push(-1)
    for (let p = Math.max(2, currentPage - 2); p <= Math.min(totalPages - 1, currentPage + 2); p++) pages.push(p)
    if (currentPage < totalPages - 3) pages.push(-1)
    if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages)

    return (
      <div className="sf-pagination">
        <button
          className="sf-page-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &#8592; Prev
        </button>
        
        {pages.map((p, i) => 
          p === -1 ? (
            <span key={`ellipsis-${i}`} className="sf-page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`sf-page-btn ${p === currentPage ? 'sf-page-active' : ''}`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="sf-page-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next &#8594;
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Foto <span>Outlet</span>
          </h1>
        </div>
        <div className="sf-header-right">
          <select 
            className="sf-select" 
            value={filterMerchantId} 
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">Semua Merchant</option>
            {merchants.map(m => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th style={{ width: '96px' }}>Preview</th>
                <th style={{ width: '220px' }}>Merchant</th>
                <th>Nama File</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-img" /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '140px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '200px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-img" /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '160px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '180px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                </>
              ) : error ? (
                <tr>
                  <td colSpan={5}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128247;</div>
                      <h3>Belum ada foto outlet</h3>
                      <p>Upload foto outlet menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const merchantName = merchantMap[item.merchant_id] || `ID ${item.merchant_id}`
                  const fname = getFilenameFromUrl(item.image_url)

                  return (
                    <tr key={item.id} className={editingId === item.id ? 'sf-editing' : ''}>
                      <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{item.id}</td>
                      
                      {editingId === item.id ? (
                        <>
                          <td colSpan={3}>
                            <div className="sf-edit-file-area">
                              {item.image_url && (
                                <img 
                                  className="sf-edit-current-thumb" 
                                  src={item.image_url} 
                                  alt="current" 
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              )}
                              <div>
                                <input
                                  type="file"
                                  id={`edit-file-${item.id}`}
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setEditFile(e.target.files[0])
                                    }
                                  }}
                                />
                                <label 
                                  className="sf-edit-file-label" 
                                  htmlFor={`edit-file-${item.id}`}
                                  style={isUploading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                >
                                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <polyline points="16 16 12 12 8 16" />
                                    <line x1="12" y1="12" x2="12" y2="21" />
                                    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                                  </svg>
                                  Ganti Foto
                                </label>
                                <div className="sf-edit-file-name">
                                  {editFile ? editFile.name : 'Biarkan kosong untuk tidak mengganti'}
                                </div>
                              </div>
                              <select
                                className="sf-select"
                                value={editMerchantId}
                                onChange={(e) => setEditMerchantId(e.target.value)}
                                style={{ minWidth: '160px', padding: '6px 28px 6px 8px', fontSize: '13px', marginLeft: 'auto' }}
                                disabled={isUploading}
                              >
                                {merchants.map(m => (
                                  <option key={m.id} value={m.id}>{m.nama}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {item.image_url ? (
                              <img 
                                className="sf-thumb" 
                                src={item.image_url} 
                                alt="foto" 
                                loading="lazy"
                                onClick={() => setLightboxUrl(item.image_url)}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const next = e.currentTarget.nextElementSibling as HTMLElement
                                  if (next) next.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className="sf-thumb-placeholder" style={{ display: item.image_url ? 'none' : 'flex' }}>
                              <svg width="20" height="20" fill="none" stroke="#D6ECFF" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          </td>
                          <td>
                            <span className="sf-merchant-tag" title={merchantName}>
                              {merchantName}
                            </span>
                          </td>
                          <td>
                            <span className="sf-url-text" title={item.image_url || ''}>
                              {fname}
                            </span>
                          </td>
                        </>
                      )}

                      <td>
                        {editingId === item.id ? (
                          <div className="sf-actions">
                            <button 
                              className="sf-btn sf-btn-save" 
                              onClick={() => saveEdit(item.id, item.image_url)}
                              disabled={isUploading}
                            >
                              {isUploading ? 'Menyimpan...' : (
                                <>
                                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Simpan
                                </>
                              )}
                            </button>
                            <button className="sf-btn sf-btn-ghost" onClick={cancelEdit} disabled={isUploading}>
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="sf-actions">
                            <button className="sf-btn sf-btn-edit" onClick={() => startEdit(item)}>
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              className="sf-btn sf-btn-hapus"
                              onClick={() => setDeleteModal({ isOpen: true, id: item.id })}
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                              </svg>
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add Form Panel */}
        <div className="sf-add-panel">
          <div className="sf-add-panel-title">Upload Foto Outlet Baru</div>
          <div className="sf-add-form-row">
            <div className="sf-add-field">
              <label>Merchant</label>
              <select 
                className="sf-select" 
                value={addMerchantId}
                onChange={(e) => setAddMerchantId(e.target.value)}
                style={{ minWidth: '200px' }}
                disabled={isUploading}
              >
                <option value="">Pilih merchant...</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            multiple 
            style={{ display: 'none' }} 
            onChange={(e) => handleFilesSelected(e.target.files)}
            disabled={isUploading}
          />

          <div
            className="sf-dropzone"
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={isUploading ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <div className="sf-dropzone-icon">&#128247;</div>
            <div className="sf-dropzone-text">Drag & drop foto di sini</div>
            <div className="sf-dropzone-hint">
              atau <span onClick={(e) => {
                e.stopPropagation()
                !isUploading && fileInputRef.current?.click()
              }}>klik untuk pilih file</span> &nbsp;·&nbsp; JPG, PNG, WEBP &nbsp;·&nbsp; Bisa pilih banyak sekaligus
            </div>
          </div>

          <div className="sf-file-preview">
            {selectedFiles.map((f, i) => (
              <div className="sf-file-item" key={`${f.name}-${i}`}>
                {!isUploading && (
                  <button className="sf-file-remove" onClick={() => removeFile(i)} title="Hapus">&#10005;</button>
                )}
                <img className="sf-file-thumb" src={URL.createObjectURL(f)} alt={f.name} />
                <div className="sf-file-name">{f.name}</div>
              </div>
            ))}
          </div>

          <div className={`sf-progress-wrap ${uploadProgress >= 0 ? 'sf-visible' : ''}`}>
            <div className="sf-progress-label">{uploadLabel}</div>
            <div className="sf-progress-bar">
              <div className="sf-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <button
                className="sf-btn sf-btn-primary"
                onClick={handleUpload}
                disabled={isUploading}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                </svg>
                {isUploading ? 'Mengupload...' : 'Upload Foto'}
              </button>
            </div>
          )}
        </div>
        
        {!loading && !error && items.length > 0 && (
          <div className="sf-summary">
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount} foto
          </div>
        )}

        {!loading && !error && renderPaginationButtons()}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Foto?"
        message="Foto ini akan dihapus permanen dari galeri outlet."
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="sf-lightbox sf-open" onClick={() => setLightboxUrl(null)}>
          <button className="sf-lightbox-close" onClick={() => setLightboxUrl(null)}>&#10005;</button>
          <img src={lightboxUrl} alt="Preview foto outlet" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
