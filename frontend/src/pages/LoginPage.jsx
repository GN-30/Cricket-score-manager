import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

export default function LoginPage() {
  const [mode, setMode]               = useState('signin')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [successMsg, setSuccessMsg]   = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const { data, error } = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) throw error

      if (mode === 'signup') {
        setSuccessMsg('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--color-deep-navy)] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-electric-blue)]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--color-neon-green)]/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
          className="relative w-full max-w-md z-10"
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex flex-col items-center gap-4 text-white group">
              <div className="w-16 h-16 bg-[var(--color-electric-blue)] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_40px_rgba(0,212,255,0.6)] group-hover:scale-105 transition-all duration-300">
                <Trophy className="w-8 h-8 text-[var(--color-deep-navy)]" />
              </div>
              <span className="text-3xl font-black uppercase tracking-widest text-glow-electric">CricManager</span>
            </Link>
          </div>

          {/* Glass Card */}
          <div className="glass-card p-10 rounded-[2rem]">
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-slate-400 text-center mb-8 font-light">
              {mode === 'signin' ? 'Sign in to access your dashboard' : 'Join the elite cricket management platform'}
            </p>

            {/* Error / Success messages */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/30 rounded-xl text-sm text-[var(--color-neon-green)]">
                {successMsg}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-electric-blue)] focus:ring-1 focus:ring-[var(--color-electric-blue)] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-electric-blue)] focus:ring-1 focus:ring-[var(--color-electric-blue)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[var(--color-electric-blue)] hover:bg-[#00b8cc] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--color-deep-navy)] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)]"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {mode === 'signin' ? 'Secure Login' : 'Create Account'}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-sm text-slate-400 mt-8 font-light">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccessMsg('') }}
                className="text-[var(--color-gold)] hover:text-white font-bold ml-1 transition-colors"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
