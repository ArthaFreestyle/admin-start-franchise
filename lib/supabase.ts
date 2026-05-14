import { createClient } from '@supabase/supabase-js'

// Langsung tembak ke process.env, jangan di-import dari 'process'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Inisialisasi Supabase Client
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)