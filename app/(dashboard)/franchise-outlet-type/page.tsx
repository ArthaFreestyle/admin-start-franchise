'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'

interface FranchiseOutletType {
  id: number
  nama: string
  icon: string | null
}

export default function FranchiseOutletTypePage() {
  const [items, setItems] = useState<FranchiseOutletType[]>([])
  const [allItems, setAllItems] = useState<FranchiseOutletType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addName, setAddName] = useState('')
  const [addIcon, setAddIcon] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [authed, setAuthed] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!sessionStorage.getItem('sf_user')) {
      window.location.replace('/login')
      return
    }
    setAuthed(true)
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('franchise_type_outlet')
      .select('id, nama, icon')
      .order('id', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setAllItems(data || [])
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) {
      loadItems()
    }
  }, [authed, loadItems])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    
    searchTimerRef.current = setTimeout(() => {
      const query = value.trim().toLowerCase()
      if (!query) {
        setItems(allItems)
      } else {
        setItems(allItems.filter((c) => c.nama.toLowerCase().includes(query)))
      }
    }, 200)
  }

  const handleAdd = async () => {
    const nama = addName.trim()
    const icon = addIcon.trim() || null
    if (!nama) return

    setIsAdding(true)
    const { error: err } = await supabase.from('franchise_type_outlet').insert({ nama, icon })

    if (err) {
      setToast({ message: `Gagal menambah: ${err.message}`, type: 'error' })
      setIsAdding(false)
      return
    }

    setAddName('')
    setAddIcon('')
    setIsAdding(false)
    setToast({ message: 'Tipe outlet berhasil ditambahkan', type: 'success' })
    loadItems()
  }

  const startEdit = (item: FranchiseOutletType) => {
    setEditingId(item.id)
    setEditName(item.nama)
    setEditIcon(item.icon || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditIcon('')
  }

  const saveEdit = async (id: number) => {
    const nama = editName.trim()
    const icon = editIcon.trim() || null
    if (!nama) return

    const { error: err } = await supabase
      .from('franchise_type_outlet')
      .update({ nama, icon })
      .eq('id', id)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setToast({ message: 'Tipe outlet berhasil diperbarui', type: 'success' })
    loadItems()
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_type_outlet')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null, name: '' })
    setToast({ message: 'Tipe outlet berhasil dihapus', type: 'success' })
    loadItems()
  }

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Tipe <span>Outlet</span>
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
            placeholder="Cari tipe outlet..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sf-card">
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th style={{ width: '100px' }}>Icon</th>
                <th>Nama Tipe Outlet</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '180px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '140px' }} /></td>
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
                      <h3>Belum ada tipe outlet</h3>
                      <p>Tambahkan tipe pertama menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className={editingId === c.id ? 'sf-editing' : ''}>
                    <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{c.id}</td>
                    
                    {editingId === c.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            className="sf-inline-input"
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            placeholder="Emoji"
                            maxLength={10}
                            style={{ width: '50px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="sf-inline-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(c.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                            maxLength={100}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: '18px' }}>{c.icon || '-'}</td>
                        <td style={{ fontWeight: 500, color: '#0A1F3D' }}>{c.nama}</td>
                      </>
                    )}

                    <td>
                      {editingId === c.id ? (
                        <div className="sf-actions">
                          <button className="sf-btn sf-btn-save" onClick={() => saveEdit(c.id)}>
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
                          <button className="sf-btn sf-btn-edit" onClick={() => startEdit(c)}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            className="sf-btn sf-btn-hapus"
                            onClick={() => setDeleteModal({ isOpen: true, id: c.id, name: c.nama })}
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
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="sf-add-row">
                <td colSpan={4}>
                  <div className="sf-add-form">
                    <input
                      type="text"
                      className="sf-inline-input"
                      placeholder="Icon (Emoji)..."
                      value={addIcon}
                      onChange={(e) => setAddIcon(e.target.value)}
                      maxLength={10}
                      style={{ width: '80px', flex: 'none' }}
                    />
                    <input
                      type="text"
                      className="sf-inline-input"
                      placeholder="Nama tipe outlet baru..."
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                      }}
                      maxLength={100}
                    />
                    <button
                      className="sf-btn sf-btn-primary"
                      onClick={handleAdd}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        'Menyimpan...'
                      ) : (
                        <>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Tambah Tipe
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {!loading && !error && items.length > 0 && (
          <div className="sf-summary">
            {searchQuery && items.length !== allItems.length
              ? `Menampilkan ${items.length} dari ${allItems.length} tipe`
              : `Total ${allItems.length} tipe`}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Tipe Outlet?"
        message={`Tipe "${deleteModal.name}" akan dihapus permanen. Pastikan tidak ada merchant yang masih menggunakan tipe ini.`}
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
