import { createClient } from '@supabase/supabase-js'
import { env } from 'process'

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
