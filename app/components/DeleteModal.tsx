'use client'

interface DeleteModalProps {
  isOpen: boolean
  title: string
  message: string
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
}

export default function DeleteModal({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="sf-modal-backdrop sf-open" onClick={onClose}>
      <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sf-modal-icon">&#128465;</div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="sf-modal-actions">
          <button
            className="sf-btn sf-btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Batal
          </button>
          <button
            className="sf-btn sf-btn-hapus"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}
