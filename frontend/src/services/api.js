import axios from 'axios'
import { supabase } from '@/lib/supabase'

// Always ensure the baseURL ends with /api
const rawUrl = import.meta.env.VITE_API_URL
const PROD_URL = 'https://cricket-score-manager-vta1.onrender.com/api'

const getBaseURL = () => {
  if (!rawUrl) {
    // No env var set — use Vite proxy in dev, hardcoded URL in prod build
    return import.meta.env.DEV ? '/api' : PROD_URL
  }
  // Strip trailing slash then ensure /api suffix
  const clean = rawUrl.replace(/\/$/, '')
  return clean.endsWith('/api') ? clean : `${clean}/api`
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Attach the Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Normalise error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export default api
