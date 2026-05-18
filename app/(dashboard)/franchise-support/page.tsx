'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'

const PAGE_SIZE = 20

interface SupportItem {
  id: number
  merchant_id: number
  nama: string
}

interface Merchant {
  id: number
  nama: string
}

export default function FranchiseSupportPage() {
  const [items, setItems] = useState<SupportItem[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [merchantMap, setMerchantMap] = useState<Record<number, string>>({})
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMerchantId, setFilterMerchantId] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addName, setAddName] = useState('')
  const [addMerchantId, setAddMerchantId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editMerchantId, setEditMerchantId] = useState('')

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

  const loadItems = useCallback(async (page: number, search: string, merchantId: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('franchise_support_merchant')
      .select('id, merchant_id, nama', { count: 'exact' })
      .order('merchant_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (merchantId) q = q.eq('merchant_id', parseInt(merchantId))
    if (search) q = q.ilike('nama', `%${search}%`)

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
      loadItems(1, '', '')
    })
  }, [loadMerchants, loadItems])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    
    searchTimerRef.current = setTimeout(() => {
      loadItems(1, value.trim(), filterMerchantId)
    }, 350)
  }

  const handleFilterChange = (merchantId: string) => {
    setFilterMerchantId(merchantId)
    loadItems(1, searchQuery, merchantId)
  }

  const handlePageChange = (page: number) => {
    loadItems(page, searchQuery, filterMerchantId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAdd = async () => {
    const nama = addName.trim()
    const merchant_id = addMerchantId

    if (!merchant_id) {
      setToast({ message: 'Pilih merchant terlebih dahulu', type: 'error' })
      return
    }
    if (!nama) return

    setIsAdding(true)
    const { error: err } = await supabase
      .from('franchise_support_merchant')
      .insert({ merchant_id: parseInt(merchant_id), nama })

    if (err) {
      setToast({ message: `Gagal menambah: ${err.message}`, type: 'error' })
      setIsAdding(false)
      return
    }

    setAddName('')
    setIsAdding(false)
    setToast({ message: 'Dukungan berhasil ditambahkan', type: 'success' })
    loadItems(currentPage, searchQuery, filterMerchantId)
  }

  const startEdit = (item: SupportItem) => {
    setEditingId(item.id)
    setEditName(item.nama)
    setEditMerchantId(item.merchant_id.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditMerchantId('')
  }

  const saveEdit = async (id: number) => {
    const nama = editName.trim()
    const merchant_id = editMerchantId

    if (!nama) return

    const { error: err } = await supabase
      .from('franchise_support_merchant')
      .update({ nama, merchant_id: parseInt(merchant_id) })
      .eq('id', id)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setToast({ message: 'Dukungan berhasil diperbarui', type: 'success' })
    loadItems(currentPage, searchQuery, filterMerchantId)
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_support_merchant')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null, name: '' })
    setToast({ message: 'Dukungan berhasil dihapus', type: 'success' })
    loadItems(currentPage, searchQuery, filterMerchantId)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null

    const pages = [1]
    if (currentPage > 4) pages.push(-1) // -1 for ellipsis
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
            Support <span>Merchant</span>
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
          <div className="sf-search-wrap">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sf-search"
              placeholder="Cari dukungan..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th style={{ width: '220px' }}>Merchant</th>
                <th>Dukungan</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '140px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '220px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '160px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '180px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '200px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                </>
              ) : error ? (
                <tr>
                  <td colSpan={4}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Belum ada data dukungan</h3>
                      <p>Tambahkan dukungan merchant menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const merchantName = merchantMap[item.merchant_id] || `ID ${item.merchant_id}`
                  return (
                    <tr key={item.id} className={editingId === item.id ? 'sf-editing' : ''}>
                      <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{item.id}</td>
                      
                      {editingId === item.id ? (
                        <>
                          <td>
                            <select
                              className="sf-select"
                              value={editMerchantId}
                              onChange={(e) => setEditMerchantId(e.target.value)}
                              style={{ minWidth: '160px', padding: '6px 28px 6px 8px', fontSize: '13px' }}
                            >
                              {merchants.map(m => (
                                <option key={m.id} value={m.id}>{m.nama}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="sf-inline-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(item.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              autoFocus
                              maxLength={200}
                              style={{ width: '100%', minWidth: '180px' }}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="sf-merchant-tag" title={merchantName}>
                              {merchantName}
                            </span>
                          </td>
                          <td style={{ color: '#0A1F3D' }}>{item.nama}</td>
                        </>
                      )}

                      <td>
                        {editingId === item.id ? (
                          <div className="sf-actions">
                            <button className="sf-btn sf-btn-save" onClick={() => saveEdit(item.id)}>
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Simpan
                            </button>
                            <button className="sf-btn sf-btn-ghost" onClick={cancelEdit}>
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
                              onClick={() => setDeleteModal({ isOpen: true, id: item.id, name: item.nama })}
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
          <div className="sf-add-panel-title">Tambah Dukungan Baru</div>
          <div className="sf-add-form">
            <div className="sf-add-field">
              <label>Merchant</label>
              <select 
                className="sf-select" 
                value={addMerchantId}
                onChange={(e) => setAddMerchantId(e.target.value)}
              >
                <option value="">Pilih merchant...</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div className="sf-add-field" style={{ flex: 1, minWidth: '200px' }}>
              <label>Isi Dukungan</label>
              <input
                type="text"
                className="sf-inline-input"
                placeholder="Contoh: Training & SOP, Peralatan lengkap..."
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
                maxLength={200}
                style={{ width: '100%' }}
              />
            </div>
            <button
              className="sf-btn sf-btn-primary"
              onClick={handleAdd}
              disabled={isAdding}
              style={{ alignSelf: 'flex-end' }}
            >
              {isAdding ? (
                'Menyimpan...'
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah
                </>
              )}
            </button>
          </div>
        </div>
        
        {!loading && !error && items.length > 0 && (
          <div className="sf-summary">
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount} dukungan
          </div>
        )}

        {!loading && !error && renderPaginationButtons()}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Dukungan?"
        message={`Item dukungan "${deleteModal.name}" ini akan dihapus permanen.`}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
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
    </>
  )
}
