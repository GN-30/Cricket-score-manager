const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
  console.warn('\n⚠️  SUPABASE_SERVICE_ROLE_KEY is missing or not set in Cricket-Backend/.env')
  console.warn('   Get it: Supabase Dashboard → Project Settings → API → service_role (secret)\n')
}

/**
 * Service Role client — bypasses Row Level Security.
 * Use ONLY on the server. Never expose this key to the frontend.
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

module.exports = { supabase }
