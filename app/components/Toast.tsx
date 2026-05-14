'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setHiding(true)
    }, 2200)

    const removeTimer = setTimeout(() => {
      onClose()
    }, 2600)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(removeTimer)
    }
  }, [onClose])

  return (
    <div className={`sf-toast sf-toast-${type} ${hiding ? 'sf-toast-hide' : ''}`}>
      {message}
    </div>
  )
}
