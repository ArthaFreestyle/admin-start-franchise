'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'

interface Category {
  id: number
  name: string
}

export default function FranchiseCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addName, setAddName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

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

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('franchise_categories')
      .select('id, name')
      .order('id', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setAllCategories(data || [])
    setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) {
      loadCategories()
    }
  }, [authed, loadCategories])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    
    searchTimerRef.current = setTimeout(() => {
      const query = value.trim().toLowerCase()
      if (!query) {
        setCategories(allCategories)
      } else {
        setCategories(allCategories.filter((c) => c.name.toLowerCase().includes(query)))
      }
    }, 200)
  }

  const handleAdd = async () => {
    const name = addName.trim()
    if (!name) return

    setIsAdding(true)
    const { error: err } = await supabase.from('franchise_categories').insert({ name })

    if (err) {
      setToast({ message: `Gagal menambah kategori: ${err.message}`, type: 'error' })
      setIsAdding(false)
      return
    }

    setAddName('')
    setIsAdding(false)
    setToast({ message: 'Kategori berhasil ditambahkan', type: 'success' })
    loadCategories()
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id: number) => {
    const name = editName.trim()
    if (!name) return

    const { error: err } = await supabase
      .from('franchise_categories')
      .update({ name })
      .eq('id', id)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setToast({ message: 'Kategori berhasil diperbarui', type: 'success' })
    loadCategories()
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_categories')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null, name: '' })
    setToast({ message: 'Kategori berhasil dihapus', type: 'success' })
    loadCategories()
  }

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Kategori <span>Franchise</span>
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
            placeholder="Cari kategori..."
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
                <th>Nama Kategori</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '180px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '140px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                  <tr className="sf-skeleton-row">
                    <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '160px' }} /></td>
                    <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                  </tr>
                </>
              ) : error ? (
                <tr>
                  <td colSpan={3}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Belum ada kategori</h3>
                      <p>Tambahkan kategori pertama menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className={editingId === c.id ? 'sf-editing' : ''}>
                    <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{c.id}</td>
                    
                    {editingId === c.id ? (
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
                    ) : (
                      <td style={{ fontWeight: 500, color: '#0A1F3D' }}>{c.name}</td>
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
                            onClick={() => setDeleteModal({ isOpen: true, id: c.id, name: c.name })}
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
                <td colSpan={3}>
                  <div className="sf-add-form">
                    <input
                      type="text"
                      className="sf-inline-input"
                      placeholder="Nama kategori baru..."
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
                          Tambah Kategori
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {!loading && !error && categories.length > 0 && (
          <div className="sf-summary">
            {searchQuery && categories.length !== allCategories.length
              ? `Menampilkan ${categories.length} dari ${allCategories.length} kategori`
              : `Total ${allCategories.length} kategori`}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Kategori?"
        message={`Kategori "${deleteModal.name}" akan dihapus permanen. Pastikan tidak ada merchant yang masih menggunakan kategori ini.`}
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
