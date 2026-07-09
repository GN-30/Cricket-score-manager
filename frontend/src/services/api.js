import axios from 'axios'
import { supabase } from '@/lib/supabase'

const api = axios.create({
  // In production, VITE_API_URL = 'https://your-backend.onrender.com/api'
  // In dev, Vite proxies /api → http://localhost:5000
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
