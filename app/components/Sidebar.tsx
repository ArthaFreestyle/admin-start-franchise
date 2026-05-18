'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const masterDataItems: NavItem[] = [
  {
    href: '/merchant-dashboard',
    label: 'Merchant',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    href: '/franchise-categories',
    label: 'Kategori',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: '/franchise-model',
    label: 'Franchise Model',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
  },
  {
    href: '/franchise-system',
    label: 'Franchise System',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/franchise-outlet-type',
    label: 'Tipe Outlet',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/franchise-package',
    label: 'Paket Iklan',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: '/franchise-package-benefit',
    label: 'Benefit Paket',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
]

const relasiMerchantItems: NavItem[] = [
  {
    href: '/franchise-support',
    label: 'Support Merchant',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/franchise-keunggulan',
    label: 'Keunggulan',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/franchise-image-outlet',
    label: 'Foto Outlet',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
]

const analyticsItems: NavItem[] = [
  {
    href: '/analytics',
    label: 'Analytics Likes',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21.21 15.89A10 10 0 118 2.83" />
        <path d="M22 12A10 10 0 0012 2v10z" />
      </svg>
    ),
  },
  {
    href: '/analytics-visitors',
    label: 'Analytics Visitors',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const close = useCallback(() => setOpen(false), [])

  const isActive = (href: string) => pathname === href

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  return (
    <>
      {/* Hamburger button — visible on mobile only */}
      <button className="sf-hamburger" onClick={toggle} aria-label="Toggle sidebar">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        className={`sf-overlay ${open ? 'sf-open' : ''}`}
        onClick={close}
      />

      {/* Sidebar */}
      <aside className={`sf-sidebar ${open ? 'sf-open' : ''}`} id="sf-sidebar">
        <div className="sf-sidebar-brand">
          <div className="sf-sidebar-logo">
            <div className="sf-sidebar-logo-dot">
              <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="sf-sidebar-title">
              Admin Panel
              <small>start-franchise.com</small>
            </div>
          </div>
          <button className="sf-sidebar-close" onClick={close}>
            &#10005;
          </button>
        </div>

        <nav className="sf-nav">
          {/* Master Data */}
          <div className="sf-nav-group">
            <div className="sf-nav-group-label">Master Data</div>
            {masterDataItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sf-nav-item ${isActive(item.href) ? 'sf-nav-active' : ''}`}
                onClick={close}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Relasi Merchant */}
          <div className="sf-nav-group">
            <div className="sf-nav-group-label">Relasi Merchant</div>
            {relasiMerchantItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sf-nav-item ${isActive(item.href) ? 'sf-nav-active' : ''}`}
                onClick={close}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Analytics */}
          <div className="sf-nav-group">
            <div className="sf-nav-group-label">Analytics</div>
            {analyticsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sf-nav-item ${isActive(item.href) ? 'sf-nav-active' : ''}`}
                onClick={close}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="sf-sidebar-footer">
          <button
            className="sf-nav-item sf-nav-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>
    </>
  )
}
