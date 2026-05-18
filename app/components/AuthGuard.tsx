'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    async function verify() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut()
        window.location.href = '/login'
        return
      }

      setVerified(true)
    }

    verify()
  }, [])

  if (!verified) return null

  return <>{children}</>
}
