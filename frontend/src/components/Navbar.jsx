import { Link, useLocation } from 'react-router-dom'
import { Trophy, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

const NAV_LINKS = [
  { to: '/matches',     label: 'Matches' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/teams',       label: 'Teams' },
  { to: '/players',     label: 'Players' },
  { to: '/analytics',   label: 'Analytics' },
]

export function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-10 h-10 rounded-xl bg-[var(--color-electric-blue)] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] transition-shadow"
          >
            <Trophy className="w-5 h-5 text-[var(--color-deep-navy)]" />
          </motion.div>
          <span className="font-black text-xl tracking-wide text-white uppercase group-hover:text-[var(--color-electric-blue)] transition-colors">CricBlitz</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="relative px-4 py-2 rounded-lg text-sm font-semibold tracking-wide uppercase transition-colors"
            >
              {isActive(to) && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white/10 rounded-lg border border-white/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${isActive(to) ? 'text-[var(--color-electric-blue)]' : 'text-slate-300 hover:text-white'}`}>
                {label}
              </span>
            </Link>
          ))}
          {user && (
            <Link
              to="/admin"
              className="relative px-4 py-2 rounded-lg text-sm font-semibold tracking-wide uppercase transition-colors"
            >
              {isActive('/admin') && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-red-500/10 rounded-lg border border-red-500/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${isActive('/admin') ? 'text-red-400' : 'text-red-400/70 hover:text-red-400'}`}>
                Admin
              </span>
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {user ? (
            <button
              onClick={signOut}
              className="hidden md:inline-flex px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex px-6 py-2.5 text-sm font-bold uppercase tracking-wider bg-[var(--color-gold)] text-[var(--color-deep-navy)] rounded-lg hover:bg-white transition-colors shadow-[0_0_15px_rgba(255,184,0,0.3)]"
            >
              Sign In
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <motion.div animate={{ rotate: menuOpen ? 90 : 0 }}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden glass border-t border-white/10"
          >
            <div className="px-4 py-6 space-y-2">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors ${
                    isActive(to)
                      ? 'bg-[var(--color-electric-blue)]/10 text-[var(--color-electric-blue)] border border-[var(--color-electric-blue)]/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {user && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors ${
                    isActive('/admin')
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'text-red-400/70 hover:bg-white/5'
                  }`}
                >
                  Admin
                </Link>
              )}
              <div className="pt-4 mt-2 border-t border-white/10">
                {user ? (
                  <button
                    onClick={() => { signOut(); setMenuOpen(false) }}
                    className="w-full text-center px-4 py-3 text-sm font-bold uppercase tracking-wide text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-bold uppercase tracking-wide bg-[var(--color-gold)] text-[var(--color-deep-navy)] rounded-xl text-center shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
