import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://abhfhsnkwdjoixukwsju.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaGZoc25rd2Rqb2l4dWt3c2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzkxMTYsImV4cCI6MjA4ODc1NTExNn0.LUHW6BsmH8i4oKEfvJoCIRNhFn6Vj2EosjcrVQZTVfg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
