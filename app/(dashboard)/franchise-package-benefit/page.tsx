'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'

const PAGE_SIZE = 20

interface Benefit {
  id: number
  package_id: number
  nama: string
}

interface PackageRef {
  id: number
  nama: string
}

function FranchisePackageBenefitInner() {
  const searchParams = useSearchParams()
  const initialPackageId = searchParams.get('package_id') ?? ''

  const [items, setItems] = useState<Benefit[]>([])
  const [packages, setPackages] = useState<PackageRef[]>([])
  const [packageMap, setPackageMap] = useState<Record<number, string>>({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterPackageId, setFilterPackageId] = useState(initialPackageId)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addName, setAddName] = useState('')
  const [addPackageId, setAddPackageId] = useState(initialPackageId)
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editPackageId, setEditPackageId] = useState('')

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadPackages = useCallback(async () => {
    const { data } = await supabase
      .from('franchise_package')
      .select('id, nama')
      .order('nama', { ascending: true })

    if (data) {
      const rows = data as PackageRef[]
      setPackages(rows)
      const map: Record<number, string> = {}
      rows.forEach((p) => { map[p.id] = p.nama || `ID ${p.id}` })
      setPackageMap(map)
    }
  }, [])

  const loadItems = useCallback(async (page: number, search: string, packageId: string) => {
    setLoading(true)
    setError(null)
    setCurrentPage(page)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('franchise_package_benefit')
      .select('id, package_id, nama', { count: 'exact' })
      .order('package_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (packageId) q = q.eq('package_id', parseInt(packageId))
    if (search) q = q.ilike('nama', `%${search}%`)

    const { data, count, error: err } = await q

    if (err) {
      setError(err.message)
      setItems([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setItems((data || []) as Benefit[])
    setTotalCount(count || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPackages().then(() => {
      loadItems(1, '', initialPackageId)
    })
  }, [loadPackages, loadItems, initialPackageId])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(() => {
      loadItems(1, value.trim(), filterPackageId)
    }, 350)
  }

  const handleFilterChange = (packageId: string) => {
    setFilterPackageId(packageId)
    loadItems(1, searchQuery, packageId)
  }

  const handlePageChange = (page: number) => {
    loadItems(page, searchQuery, filterPackageId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAdd = async () => {
    const nama = addName.trim()
    if (!addPackageId) {
      setToast({ message: 'Pilih paket terlebih dahulu', type: 'error' })
      return
    }
    if (!nama) {
      setToast({ message: 'Isi benefit wajib diisi', type: 'error' })
      return
    }

    setIsAdding(true)
    const { error: err } = await supabase
      .from('franchise_package_benefit')
      .insert({ package_id: parseInt(addPackageId), nama })

    if (err) {
      setToast({ message: `Gagal menambah: ${err.message}`, type: 'error' })
      setIsAdding(false)
      return
    }

    setAddName('')
    setIsAdding(false)
    setToast({ message: 'Benefit berhasil ditambahkan', type: 'success' })
    loadItems(currentPage, searchQuery, filterPackageId)
  }

  const startEdit = (item: Benefit) => {
    setEditingId(item.id)
    setEditName(item.nama)
    setEditPackageId(item.package_id.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPackageId('')
  }

  const saveEdit = async (id: number) => {
    const nama = editName.trim()
    if (!editPackageId) {
      setToast({ message: 'Pilih paket terlebih dahulu', type: 'error' })
      return
    }
    if (!nama) {
      setToast({ message: 'Isi benefit wajib diisi', type: 'error' })
      return
    }

    const { error: err } = await supabase
      .from('franchise_package_benefit')
      .update({ nama, package_id: parseInt(editPackageId) })
      .eq('id', id)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setToast({ message: 'Benefit berhasil diperbarui', type: 'success' })
    loadItems(currentPage, searchQuery, filterPackageId)
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_package_benefit')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null, name: '' })
    setToast({ message: 'Benefit berhasil dihapus', type: 'success' })
    loadItems(currentPage, searchQuery, filterPackageId)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null

    const pages: number[] = [1]
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
            Benefit <span>Paket</span>
          </h1>
        </div>
        <div className="sf-header-right">
          <select
            className="sf-select"
            value={filterPackageId}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">Semua Paket</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.nama || `ID ${p.id}`}</option>
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
              placeholder="Cari benefit..."
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
                <th style={{ width: '220px' }}>Paket</th>
                <th>Benefit</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <tr key={i} className="sf-skeleton-row">
                      <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '140px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '220px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                    </tr>
                  ))}
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
                      <h3>Belum ada benefit</h3>
                      <p>Tambahkan benefit paket menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const packageName = packageMap[item.package_id] || `ID ${item.package_id}`
                  return (
                    <tr key={item.id} className={editingId === item.id ? 'sf-editing' : ''}>
                      <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{item.id}</td>

                      {editingId === item.id ? (
                        <>
                          <td>
                            <select
                              className="sf-select"
                              value={editPackageId}
                              onChange={(e) => setEditPackageId(e.target.value)}
                              style={{ minWidth: '160px', padding: '6px 28px 6px 8px', fontSize: '13px' }}
                            >
                              {packages.map((p) => (
                                <option key={p.id} value={p.id}>{p.nama || `ID ${p.id}`}</option>
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
                            <span className="sf-merchant-tag" title={packageName}>
                              {packageName}
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

        <div className="sf-add-panel">
          <div className="sf-add-panel-title">Tambah Benefit Baru</div>
          <div className="sf-add-form">
            <div className="sf-add-field">
              <label>Paket</label>
              <select
                className="sf-select"
                value={addPackageId}
                onChange={(e) => setAddPackageId(e.target.value)}
              >
                <option value="">Pilih paket...</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama || `ID ${p.id}`}</option>
                ))}
              </select>
            </div>
            <div className="sf-add-field" style={{ flex: 1, minWidth: '200px' }}>
              <label>Isi Benefit</label>
              <input
                type="text"
                className="sf-inline-input"
                placeholder="Contoh: Listing di halaman utama..."
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
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount} benefit
          </div>
        )}

        {!loading && !error && renderPaginationButtons()}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Benefit?"
        message={`Benefit "${deleteModal.name}" akan dihapus permanen.`}
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

export default function FranchisePackageBenefitPage() {
  return (
    <Suspense fallback={null}>
      <FranchisePackageBenefitInner />
    </Suspense>
  )
}
