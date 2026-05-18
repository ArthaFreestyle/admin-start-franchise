'use client'

import Link from 'next/link'
import { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from '@/app/components/Toast'
import DeleteModal from '@/app/components/DeleteModal'
import { formatIDR } from '@/lib/utils'

type PaymentType = 'One Time Payment' | 'Recurring'

const PAYMENT_TYPES: PaymentType[] = ['One Time Payment', 'Recurring']

const PAYMENT_LABEL: Record<PaymentType, string> = {
  'One Time Payment': 'Sekali Bayar',
  'Recurring': 'Berulang',
}

interface Package {
  id: number
  nama: string | null
  deskripsi: string | null
  price: number | null
  Payement_Type: PaymentType | null
  created_at: string
}

interface FormState {
  nama: string
  price: string
  paymentType: string
  deskripsi: string
}

const emptyForm: FormState = { nama: '', price: '', paymentType: '', deskripsi: '' }

export default function FranchisePackagePage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [allPackages, setAllPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [addForm, setAddForm] = useState<FormState>(emptyForm)
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadPackages = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('franchise_package')
      .select('id, nama, deskripsi, price, "Payement_Type", created_at')
      .order('id', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const rows = (data || []) as Package[]
    setAllPackages(rows)
    setPackages(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(() => {
      const query = value.trim().toLowerCase()
      if (!query) {
        setPackages(allPackages)
      } else {
        setPackages(allPackages.filter((p) => (p.nama || '').toLowerCase().includes(query)))
      }
    }, 300)
  }

  const validate = (form: FormState): { ok: true; payload: { nama: string; price: number; deskripsi: string | null; 'Payement_Type': PaymentType } } | { ok: false; message: string } => {
    const nama = form.nama.trim()
    if (!nama) return { ok: false, message: 'Nama paket wajib diisi' }

    const priceTrim = form.price.trim()
    const priceNum = Number(priceTrim)
    if (!priceTrim || !Number.isFinite(priceNum) || !Number.isInteger(priceNum) || priceNum < 0) {
      return { ok: false, message: 'Harga harus berupa angka positif' }
    }

    if (!form.paymentType || !PAYMENT_TYPES.includes(form.paymentType as PaymentType)) {
      return { ok: false, message: 'Pilih tipe pembayaran' }
    }

    const deskripsiTrim = form.deskripsi.trim()
    return {
      ok: true,
      payload: {
        nama,
        price: priceNum,
        deskripsi: deskripsiTrim || null,
        'Payement_Type': form.paymentType as PaymentType,
      },
    }
  }

  const handleAdd = async () => {
    const result = validate(addForm)
    if (!result.ok) {
      setToast({ message: result.message, type: 'error' })
      return
    }

    setIsAdding(true)
    const { error: err } = await supabase.from('franchise_package').insert(result.payload)

    if (err) {
      setToast({ message: `Gagal menambah paket: ${err.message}`, type: 'error' })
      setIsAdding(false)
      return
    }

    setAddForm(emptyForm)
    setIsAdding(false)
    setToast({ message: 'Paket berhasil ditambahkan', type: 'success' })
    loadPackages()
  }

  const startEdit = (pkg: Package) => {
    setEditingId(pkg.id)
    setEditForm({
      nama: pkg.nama || '',
      price: pkg.price != null ? String(pkg.price) : '',
      paymentType: pkg.Payement_Type || '',
      deskripsi: pkg.deskripsi || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const saveEdit = async (id: number) => {
    const result = validate(editForm)
    if (!result.ok) {
      setToast({ message: result.message, type: 'error' })
      return
    }

    const { error: err } = await supabase
      .from('franchise_package')
      .update(result.payload)
      .eq('id', id)

    if (err) {
      setToast({ message: `Gagal menyimpan: ${err.message}`, type: 'error' })
      return
    }

    setEditingId(null)
    setEditForm(emptyForm)
    setToast({ message: 'Paket berhasil diperbarui', type: 'success' })
    loadPackages()
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    const { error: err } = await supabase
      .from('franchise_package')
      .delete()
      .eq('id', deleteModal.id)

    setIsDeleting(false)

    if (err) {
      setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      setToast({ message: `Gagal menghapus: ${err.message}`, type: 'error' })
      return
    }

    setDeleteModal({ isOpen: false, id: null, name: '' })
    setToast({ message: 'Paket berhasil dihapus', type: 'success' })
    loadPackages()
  }

  const renderEditForm = (
    form: FormState,
    setForm: (f: FormState) => void,
    onSave: () => void,
    onCancel: () => void,
  ) => (
    <div className="sf-add-form" style={{ flexWrap: 'wrap', gap: '12px' }}>
      <div className="sf-add-field" style={{ flex: '1 1 180px', minWidth: '180px' }}>
        <label>Nama Paket</label>
        <input
          type="text"
          className="sf-inline-input"
          value={form.nama}
          onChange={(e) => setForm({ ...form, nama: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onCancel()
          }}
          maxLength={200}
          style={{ width: '100%' }}
          autoFocus
        />
      </div>
      <div className="sf-add-field" style={{ flex: '0 0 140px' }}>
        <label>Harga (Rp)</label>
        <input
          type="number"
          className="sf-inline-input"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onCancel()
          }}
          min="0"
          step="1000"
          style={{ width: '100%' }}
        />
      </div>
      <div className="sf-add-field" style={{ flex: '0 0 180px' }}>
        <label>Tipe Pembayaran</label>
        <select
          className="sf-select"
          value={form.paymentType}
          onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
        >
          <option value="">Pilih tipe...</option>
          {PAYMENT_TYPES.map((t) => (
            <option key={t} value={t}>{PAYMENT_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <div className="sf-add-field" style={{ flex: '1 1 100%' }}>
        <label>Deskripsi</label>
        <textarea
          className="sf-inline-input"
          rows={3}
          value={form.deskripsi}
          onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave()
          }}
          maxLength={1000}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      <div className="sf-actions" style={{ marginLeft: 'auto' }}>
        <button className="sf-btn sf-btn-save" onClick={onSave}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Simpan
        </button>
        <button className="sf-btn sf-btn-ghost" onClick={onCancel}>
          Batal
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="sf-header">
        <div className="sf-header-left">
          <h1>
            Paket <span>Iklan</span>
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
            placeholder="Cari paket..."
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
                <th>Nama Paket</th>
                <th>Deskripsi</th>
                <th style={{ width: '140px' }}>Harga</th>
                <th style={{ width: '120px' }}>Tipe Bayar</th>
                <th style={{ width: '100px' }}>Benefit</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <tr key={i} className="sf-skeleton-row">
                      <td><div className="sf-skeleton-block" style={{ width: '30px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '160px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '200px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '100px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '80px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '70px' }} /></td>
                      <td><div className="sf-skeleton-block" style={{ width: '120px' }} /></td>
                    </tr>
                  ))}
                </>
              ) : error ? (
                <tr>
                  <td colSpan={7}>
                    <div className="sf-state sf-state-error">
                      <div className="sf-state-icon">&#9888;</div>
                      <h3>Gagal memuat data</h3>
                      <p>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="sf-state">
                      <div className="sf-state-icon">&#128203;</div>
                      <h3>Belum ada paket iklan</h3>
                      <p>Tambahkan paket pertama menggunakan form di bawah tabel.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => {
                  const isEditing = editingId === pkg.id
                  const typeLabel = pkg.Payement_Type ? PAYMENT_LABEL[pkg.Payement_Type] : '-'
                  return (
                    <Fragment key={pkg.id}>
                      <tr className={isEditing ? 'sf-editing' : ''}>
                        <td style={{ color: 'var(--sf-text-muted)', fontSize: '13px' }}>{pkg.id}</td>
                        <td style={{ fontWeight: 500, color: '#0A1F3D' }}>{pkg.nama || '-'}</td>
                        <td>
                          <div
                            title={pkg.deskripsi || ''}
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '320px',
                            }}
                          >
                            {pkg.deskripsi || '-'}
                          </div>
                        </td>
                        <td>{pkg.price != null ? formatIDR(pkg.price) : '-'}</td>
                        <td>
                          {pkg.Payement_Type ? (
                            <span className="sf-merchant-tag">{typeLabel}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/franchise-package-benefit?package_id=${pkg.id}`}
                            className="sf-btn sf-btn-edit"
                          >
                            Kelola &rarr;
                          </Link>
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="sf-actions">
                              <button className="sf-btn sf-btn-ghost" onClick={cancelEdit}>
                                Tutup
                              </button>
                            </div>
                          ) : (
                            <div className="sf-actions">
                              <button className="sf-btn sf-btn-edit" onClick={() => startEdit(pkg)}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                className="sf-btn sf-btn-hapus"
                                onClick={() => setDeleteModal({ isOpen: true, id: pkg.id, name: pkg.nama || `ID ${pkg.id}` })}
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
                      {isEditing && (
                        <tr className="sf-editing">
                          <td colSpan={7}>
                            {renderEditForm(editForm, setEditForm, () => saveEdit(pkg.id), cancelEdit)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sf-add-panel">
          <div className="sf-add-panel-title">Tambah Paket Baru</div>
          <div className="sf-add-form" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="sf-add-field" style={{ flex: '1 1 180px', minWidth: '180px' }}>
              <label>Nama Paket</label>
              <input
                type="text"
                className="sf-inline-input"
                placeholder="Contoh: Paket Premium"
                value={addForm.nama}
                onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
                maxLength={200}
                style={{ width: '100%' }}
              />
            </div>
            <div className="sf-add-field" style={{ flex: '0 0 140px' }}>
              <label>Harga (Rp)</label>
              <input
                type="number"
                className="sf-inline-input"
                placeholder="0"
                value={addForm.price}
                onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
                min="0"
                step="1000"
                style={{ width: '100%' }}
              />
            </div>
            <div className="sf-add-field" style={{ flex: '0 0 180px' }}>
              <label>Tipe Pembayaran</label>
              <select
                className="sf-select"
                value={addForm.paymentType}
                onChange={(e) => setAddForm({ ...addForm, paymentType: e.target.value })}
              >
                <option value="">Pilih tipe...</option>
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{PAYMENT_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="sf-add-field" style={{ flex: '1 1 100%' }}>
              <label>Deskripsi</label>
              <textarea
                className="sf-inline-input"
                rows={3}
                placeholder="Detail paket..."
                value={addForm.deskripsi}
                onChange={(e) => setAddForm({ ...addForm, deskripsi: e.target.value })}
                maxLength={1000}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <button
              className="sf-btn sf-btn-primary"
              onClick={handleAdd}
              disabled={isAdding}
              style={{ marginLeft: 'auto' }}
            >
              {isAdding ? (
                'Menyimpan...'
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Paket
                </>
              )}
            </button>
          </div>
        </div>

        {!loading && !error && packages.length > 0 && (
          <div className="sf-summary">
            {searchQuery && packages.length !== allPackages.length
              ? `Menampilkan ${packages.length} dari ${allPackages.length} paket`
              : `Total ${allPackages.length} paket`}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        title="Hapus Paket?"
        message={`Paket "${deleteModal.name}" akan dihapus permanen, termasuk SEMUA benefit yang terkait. Aksi ini tidak dapat dibatalkan.`}
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
