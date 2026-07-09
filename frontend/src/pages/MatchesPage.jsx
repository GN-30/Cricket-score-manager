import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, Activity, Trophy, Zap, Clock, X, AlertCircle, CheckCircle2, Radio } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'
import { triggerWinCelebration } from '@/components/Celebration'
import { useAuth } from '@/contexts/AuthContext'

gsap.registerPlugin(ScrollTrigger)

/* ─── Toast Notification ─────────────────────────────────────────── */
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  const colors = {
    info: { bg: 'rgba(0,212,255,0.12)', border: '#00d4ff44', text: '#00d4ff', Icon: AlertCircle },
    warn: { bg: 'rgba(255,184,0,0.12)', border: '#FFB80044', text: '#FFB800', Icon: AlertCircle },
    success: { bg: 'rgba(57,255,142,0.12)', border: '#39ff8e44', text: '#39ff8e', Icon: CheckCircle2 },
  }
  const c = colors[type] || colors.info
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      style={{
        position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', borderRadius: 12, background: c.bg,
        border: `1px solid ${c.border}`, backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)', minWidth: 280, maxWidth: 420,
        color: 'white', fontSize: 14, fontWeight: 600,
      }}
    >
      <c.Icon size={18} style={{ color: c.text, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'none', padding: 0 }}>
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ─── Result Modal (Completed match read-only) ───────────────────── */
function ResultModal({ match, onClose }) {
  const innings = match.score?.innings ?? []
  const actualWinnerId = match.score?.winnerId || match.winnerId
  const homeWon = actualWinnerId ? actualWinnerId === match.homeTeamId
    : (innings[0]?.totalRuns ?? 0) >= (innings[1]?.totalRuns ?? 0)
  const winner = actualWinnerId === 'TIE' ? { name: 'Match Tied' } : (homeWon ? match.homeTeam : match.awayTeam)

  useEffect(() => {
    triggerWinCelebration()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15,25,40,0.98) 0%, rgba(10,18,32,0.98) 100%)',
          border: '1px solid rgba(57,255,142,0.3)',
          borderRadius: 24,
          padding: '36px 32px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 0 60px rgba(57,255,142,0.15), 0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'none' }}>
          <X size={20} />
        </button>

        {/* Trophy */}
        <div className="text-center mb-6">
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
          <p style={{ color: '#ffd700', fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Match Result</p>
          <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {winner?.name ?? 'TBD'} Wins!
          </h2>
        </div>

        {/* Scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {innings.map((inn, i) => {
            const teamName = inn.teamId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name
            const overs = `${Math.floor((inn.balls ?? 0) / 6)}.${(inn.balls ?? 0) % 6}`
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div>
                  <div style={{ color: 'rgba(148,163,184,0.8)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {i + 1}{i === 0 ? 'st' : 'nd'} Innings · {teamName ?? `Team ${i + 1}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'white', fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>
                    {inn.totalRuns ?? 0}
                    <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 16 }}>/{inn.wickets ?? 0}</span>
                  </span>
                  <div style={{ color: 'rgba(148,163,184,0.5)', fontSize: 11, marginTop: 2 }}>{overs} ov</div>
                </div>
              </div>
            )
          })}
          {innings.length === 0 && (
            <p style={{ color: 'rgba(148,163,184,0.5)', textAlign: 'center', fontSize: 13 }}>No detailed scorecard available.</p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 24, width: '100%', padding: '12px', borderRadius: 12,
            background: 'linear-gradient(135deg, #39ff8e22, #00d4ff22)',
            border: '1px solid rgba(57,255,142,0.3)',
            color: '#39ff8e', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'none',
          }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ─── Status Config ──────────────────────────────────────────────── */
const STATUS_CFG = {
  SCHEDULED: {
    label: 'Scheduled',
    pill: 'bg-white/10 text-white border-white/20',
    dot: 'bg-slate-400',
    color: 'rgba(148,163,184,0.8)',
    glow: 'rgba(148,163,184,0.15)',
  },
  LIVE: {
    label: 'Live',
    pill: 'bg-[var(--color-electric-blue)]/20 text-[var(--color-electric-blue)] border-[var(--color-electric-blue)]/30',
    dot: 'bg-[var(--color-electric-blue)] animate-pulse',
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.25)',
  },
  COMPLETED: {
    label: 'Completed',
    pill: 'bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)] border-[var(--color-neon-green)]/20',
    dot: 'bg-[var(--color-neon-green)]',
    color: '#39ff8e',
    glow: 'rgba(57,255,142,0.18)',
  },
  ABANDONED: {
    label: 'Abandoned',
    pill: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
    color: '#f87171',
    glow: 'rgba(248,113,113,0.15)',
  },
}

const FILTERS = ['All', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ABANDONED']

/* ─── Cricket Ball SVG ───────────────────────────────────────────── */
function CricketBall({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <circle cx="24" cy="24" r="22" fill="#c0392b" />
      <circle cx="24" cy="24" r="22" fill="url(#ballShine)" />
      {/* Seam curve top */}
      <path d="M14 10 Q24 18 34 10" stroke="#8b0000" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M12 12 Q24 22 36 12" stroke="#f5c6c6" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Seam curve bottom */}
      <path d="M14 38 Q24 30 34 38" stroke="#8b0000" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M12 36 Q24 26 36 36" stroke="#f5c6c6" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Vertical seam */}
      <path d="M24 4 Q30 14 30 24 Q30 34 24 44" stroke="#8b0000" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Shine */}
      <ellipse cx="17" cy="16" rx="5" ry="3" fill="white" opacity="0.18" transform="rotate(-30 17 16)" />
      <defs>
        <radialGradient id="ballShine" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="black" stopOpacity="0.3" />
        </radialGradient>
      </defs>
    </svg>
  )
}

/* ─── Magnetic Card Hover ────────────────────────────────────────── */
function useMagnetic(ref, strength = 0.25) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) * strength
      const dy = (e.clientY - cy) * strength
      gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' })
      // Spotlight effect via custom property
      const px = ((e.clientX - rect.left) / rect.width) * 100
      const py = ((e.clientY - rect.top) / rect.height) * 100
      el.style.setProperty('--mx', `${px}%`)
      el.style.setProperty('--my', `${py}%`)
    }
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength])
}

/* ─── Radar Ping (for LIVE) ─────────────────────────────────────── */
function RadarPing({ color = '#00d4ff' }) {
  return (
    <span className="relative flex items-center justify-center w-3 h-3">
      <span
        className="absolute inline-flex w-full h-full rounded-full animate-ping"
        style={{ backgroundColor: color, opacity: 0.5 }}
      />
      <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

/* ─── Team Badge ─────────────────────────────────────────────────── */
function TeamBadge({ team, isWinner, accentColor }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2.5 relative">
      {isWinner && (
        <div
          className="absolute -top-4 text-[10px] font-black tracking-widest uppercase"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.6)' }}
        >
          ★ Winner
        </div>
      )}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-300 relative overflow-hidden"
        style={
          isWinner
            ? {
                background: 'linear-gradient(135deg, #ffd700, #ff9500)',
                color: '#020c1b',
                boxShadow: '0 0 24px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
              }
            : {
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.12)',
              }
        }
      >
        {/* Inner shimmer for winner */}
        {isWinner && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(135deg, white 0%, transparent 60%)',
            }}
          />
        )}
        <span className="relative z-10">{team?.shortName?.[0] ?? '?'}</span>
      </div>
      <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
        {team?.shortName ?? 'TBD'}
      </span>
    </div>
  )
}

/* ─── Match Countdown ────────────────────────────────────────────── */
function MatchCountdown({ date }) {
  const [timeLeft, setTimeLeft] = useState('')
  
  useEffect(() => {
    if (!date) return
    
    const update = () => {
      const diff = new Date(date) - new Date()
      if (diff <= 0) {
        setTimeLeft('Starting soon...')
        return
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const m = Math.floor((diff / 1000 / 60) % 60)
      const s = Math.floor((diff / 1000) % 60)
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <div className="relative z-10 flex items-center justify-between text-xs font-bold text-slate-400 bg-black/20 rounded-xl px-4 py-2.5 border border-white/5 mt-1 backdrop-blur-md">
      <span className="flex items-center gap-1.5 uppercase tracking-widest"><Clock size={12} className="text-[#00d4ff]" /> Starts In:</span>
      <span className="text-white tracking-widest font-mono text-sm">{timeLeft}</span>
    </div>
  )
}

/* ─── Match Card ─────────────────────────────────────────────────── */
function MatchCard({ match, index, onScheduledClick, onCompletedClick }) {
  const cardRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const cfg = STATUS_CFG[match.status] ?? STATUS_CFG.SCHEDULED
  const actualWinnerId = match.score?.winnerId || match.winnerId
  const homeWon = match.status === 'COMPLETED' && (actualWinnerId ? actualWinnerId === match.homeTeamId : false)
  const awayWon = match.status === 'COMPLETED' && (actualWinnerId ? actualWinnerId === match.awayTeamId : false)
  const isLive = match.status === 'LIVE'
  const isScheduled = match.status === 'SCHEDULED'
  const isCompleted = match.status === 'COMPLETED'

  let displayFormat = match.format ?? 'T20'
  try {
    const parsed = JSON.parse(match.format)
    if (parsed && parsed.overs) {
      displayFormat = `${parsed.overs}v / ${parsed.playersPerTeam}p`
    }
  } catch (e) {
    // legacy string format
  }

  useMagnetic(cardRef, 0.18)

  const handleClick = () => {
    if (isScheduled) {
      onScheduledClick?.()
    } else if (isLive) {
      if (user) navigate(`/match/${match.id}`)
      else navigate(`/match/${match.id}`) // allow view
    } else if (isCompleted) {
      onCompletedClick?.(match)
    }
  }

  return (
    <div
      ref={cardRef}
      className="match-card group cursor-pointer"
      style={{ willChange: 'transform' }}
      onClick={handleClick}
    >
      <div
        className="relative rounded-2xl p-6 flex flex-col gap-4 overflow-hidden h-full transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${isLive ? cfg.color + '44' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isLive
            ? `0 0 30px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Spotlight layer — follows cursor via CSS vars */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), ${cfg.glow}, transparent 70%)`,
          }}
        />

        {/* Live glow border sweep */}
        {isLive && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
            style={{ opacity: 0.6 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `conic-gradient(from 0deg at 50% 50%, transparent 0%, ${cfg.color}66 20%, transparent 40%)`,
                animation: 'spinGlow 3s linear infinite',
              }}
            />
          </div>
        )}

        {/* Top row: status + format */}
        <div className="flex items-center justify-between relative z-10">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.pill}`}
          >
            {isLive ? <RadarPing color={cfg.color} /> : (
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            )}
            {cfg.label}
          </span>
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md whitespace-nowrap"
            style={{
              color: '#ffd700',
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            {displayFormat}
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3 py-3 relative z-10">
          <TeamBadge team={match.homeTeam} isWinner={homeWon} accentColor={cfg.color} />

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1">
            <CricketBall size={28} className="opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            <span
              className="text-xs font-black italic tracking-widest"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              VS
            </span>
          </div>

          <TeamBadge team={match.awayTeam} isWinner={awayWon} accentColor={cfg.color} />
        </div>

        {/* Score strip (visible for live/completed) */}
        {(isLive || match.status === 'COMPLETED') && match.score && (
          <div
            className="relative z-10 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm font-mono font-bold"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ color: cfg.color }}>
              {match.score.innings?.[0]?.totalRuns ?? '0'}/{match.score.innings?.[0]?.wickets ?? '0'}
            </span>
            <Activity size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              {match.score.innings?.[1] ? `${match.score.innings[1].totalRuns}/${match.score.innings[1].wickets}` : '—'}
            </span>
          </div>
        )}

        {/* Countdown Timer for Scheduled Matches */}
        {match.status === 'SCHEDULED' && match.date && (
           <MatchCountdown date={match.date} />
        )}

        {/* Footer */}
        <div
          className="flex justify-between items-center text-[11px] text-slate-400 font-medium pt-3 border-t relative z-10"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <span className="flex items-center gap-1.5">
            <MapPin size={12} style={{ color: cfg.color }} />
            {match.venue ?? 'TBD'}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={12} style={{ color: cfg.color }} />
            {match.date
              ? new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton Card ──────────────────────────────────────────────── */
function SkeletonCard({ i }) {
  return (
    <div
      className="skeleton-card rounded-2xl overflow-hidden"
      style={{
        height: 220,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        animationDelay: `${i * 0.08}s`,
      }}
    >
      <div className="h-full w-full relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
            animation: 'shimmer 1.8s infinite',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  )
}

/* ─── Filter Pill ────────────────────────────────────────────────── */
function FilterPill({ label, active, onClick, cfg }) {
  const ref = useRef(null)
  const color = cfg?.color ?? '#00d4ff'

  const handleClick = () => {
    gsap.fromTo(ref.current,
      { scale: 0.92 },
      { scale: 1, duration: 0.35, ease: 'back.out(2)' }
    )
    onClick()
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className="filter-pill relative px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors duration-200 overflow-hidden"
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${color}33, ${color}18)`,
              border: `1px solid ${color}66`,
              color: color,
              boxShadow: `0 0 20px ${color}30`,
            }
          : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(148,163,184,0.9)',
            }
      }
    >
      {active && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)` }}
        />
      )}
      <span className="relative z-10">
        {label === 'All' ? 'All Matches' : (STATUS_CFG[label]?.label ?? label)}
      </span>
    </button>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function MatchesPage() {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [prevFilter, setPrev]   = useState('All')
  const [animKey, setAnimKey]   = useState(0)
  const [toast, setToast]       = useState(null)   // { message, type }
  const [resultMatch, setResultMatch] = useState(null) // match to show in ResultModal

  const pageRef    = useRef(null)
  const headerRef  = useRef(null)
  const ballRef    = useRef(null)
  const trailRef   = useRef(null)
  const titleRef   = useRef(null)
  const subtitleRef = useRef(null)
  const filtersRef = useRef(null)
  const gridRef    = useRef(null)
  const countRef   = useRef(null)

  const showToast = useCallback((message, type = 'warn') => {
    setToast({ message, type })
  }, [])

  /* ── Fetch ── */
  useEffect(() => {
    api.get('/matches')
      .then(res => setMatches(res.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])


  /* ── Master Entry Timeline ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      /* 1. Background pitch lines draw in */
      tl.fromTo('.pitch-line',
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 1.2, stagger: 0.06, ease: 'power2.inOut', transformOrigin: 'left center' },
        0
      )

      /* 2. Ball rolls across from left off-screen */
      if (ballRef.current) {
        tl.fromTo(ballRef.current,
          { x: -120, y: 0, rotation: 0, opacity: 0 },
          { x: 0, y: 0, rotation: 720, opacity: 1, duration: 1.1, ease: 'power2.out' },
          0.4
        )
      }

      /* 3. Trail line grows behind ball */
      if (trailRef.current) {
        tl.fromTo(trailRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.9, ease: 'power2.out', transformOrigin: 'left center' },
          0.5
        )
      }

      /* 4. Title slams in */
      if (titleRef.current) {
        tl.fromTo(titleRef.current,
          { opacity: 0, y: 40, skewX: -8 },
          { opacity: 1, y: 0, skewX: 0, duration: 0.7, ease: 'back.out(1.8)' },
          1.0
        )
      }

      /* 5. Subtitle */
      if (subtitleRef.current) {
        tl.fromTo(subtitleRef.current,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.5 },
          1.4
        )
      }

      /* 6. Filter pills deal in */
      tl.fromTo('.filter-pill',
        { opacity: 0, y: 20, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.45, ease: 'back.out(1.5)' },
        1.6
      )

      /* 7. Count badge */
      if (countRef.current) {
        tl.fromTo(countRef.current,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' },
          2.0
        )
      }
    }, pageRef)

    return () => ctx.revert()
  }, [])

  /* ── Cards animate in after load ── */
  useEffect(() => {
    if (loading) return
    if (!gridRef.current) return
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.match-card')
      if (!cards.length) return
      
      gsap.fromTo(cards,
        {
          opacity: 0,
          y: 60,
          rotateX: 14,
          scale: 0.92,
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.65,
          stagger: { amount: 0.7, from: 'start' },
          ease: 'back.out(1.3)',
          delay: 0.2,
        }
      )
    }, gridRef)
    return () => ctx.revert()
  }, [loading, animKey])

  /* ── Filter change: scatter → redeal ── */
  const handleFilter = useCallback((f) => {
    if (f === filter) return
    const cards = gridRef.current?.querySelectorAll('.match-card')
    if (cards?.length) {
      gsap.to(cards, {
        opacity: 0,
        y: -30,
        scale: 0.9,
        stagger: { amount: 0.25, from: 'random' },
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          setPrev(filter)
          setFilter(f)
          setAnimKey(k => k + 1)
        },
      })
    } else {
      setPrev(filter)
      setFilter(f)
      setAnimKey(k => k + 1)
    }
  }, [filter])

  const liveMatches = matches.filter(m => m.status === 'LIVE')
  const liveCount = liveMatches.length
  // For non-live sections: apply filter
  const nonLiveShown = (() => {
    if (filter === 'All') return matches.filter(m => m.status !== 'LIVE')
    if (filter === 'LIVE') return [] // live shown separately above
    return matches.filter(m => m.status === filter)
  })()
  const allShown = filter === 'LIVE' ? liveMatches : (filter === 'All' ? matches : matches.filter(m => m.status === filter))

  return (
    <PageTransition>
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Result Modal ── */}
      <AnimatePresence>
        {resultMatch && (
          <ResultModal
            key="result-modal"
            match={resultMatch}
            onClose={() => setResultMatch(null)}
          />
        )}
      </AnimatePresence>

      <div ref={pageRef} className="relative min-h-screen" style={{ background: 'transparent' }}>

        {/* ── Animated Pitch-Line Background ──────────────────────── */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {/* Horizontal pitch lines */}
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className="pitch-line absolute"
              style={{
                left: 0,
                right: 0,
                top: `${6 + i * 7}%`,
                height: '1px',
                background: `rgba(255,255,255,${0.012 + (i % 3) * 0.006})`,
                opacity: 0,
                transform: 'scaleX(0)',
              }}
            />
          ))}
          {/* Vertical pitch lines */}
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={`v${i}`}
              className="pitch-line absolute"
              style={{
                top: 0,
                bottom: 0,
                left: `${5 + i * 10}%`,
                width: '1px',
                background: `rgba(255,255,255,${0.01 + (i % 2) * 0.008})`,
                opacity: 0,
                transform: 'scaleY(0)',
                transformOrigin: 'top',
              }}
            />
          ))}
          {/* Ambient gradient blobs */}
          <div
            className="absolute"
            style={{
              top: '-20%', left: '-10%',
              width: '60%', height: '60%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
              animation: 'blobDrift 12s ease-in-out infinite alternate',
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '-20%', right: '-10%',
              width: '70%', height: '70%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(57,255,142,0.03) 0%, transparent 70%)',
              animation: 'blobDrift 16s ease-in-out infinite alternate-reverse',
            }}
          />
        </div>

        {/* ── Page Content ─────────────────────────────────────────── */}
        <div className="container mx-auto px-4 py-12 relative" style={{ zIndex: 10 }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div ref={headerRef} className="mb-12">
            {/* Ball + trail intro */}
            <div className="flex items-center gap-4 mb-3 overflow-hidden">
              <div ref={ballRef} style={{ opacity: 0, flexShrink: 0 }}>
                <CricketBall size={44} />
              </div>
              <div
                ref={trailRef}
                style={{
                  height: '2px',
                  flex: '0 0 60px',
                  background: 'linear-gradient(90deg, rgba(192,57,43,0.8), transparent)',
                  opacity: 0,
                  transform: 'scaleX(0)',
                  transformOrigin: 'left center',
                  borderRadius: 2,
                }}
              />
              {/* Live indicator */}
              {liveCount > 0 && !loading && (
                <div
                  ref={countRef}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00d4ff',
                    boxShadow: '0 0 16px rgba(0,212,255,0.2)',
                  }}
                >
                  <RadarPing color="#00d4ff" />
                  {liveCount} Live Now
                </div>
              )}
              {liveCount === 0 && <div ref={countRef} />}
            </div>

            {/* Title */}
            <div ref={titleRef} style={{ opacity: 0 }}>
              <h1
                className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-3"
                style={{ color: 'white' }}
              >
                Match{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #39ff8e 60%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Center
                </span>
              </h1>
            </div>

            <p
              ref={subtitleRef}
              className="text-slate-400 font-light text-lg"
              style={{ opacity: 0 }}
            >
              Live updates, schedules &amp; past results — all in one ground.
            </p>
          </div>

          {/* ── Filters ────────────────────────────────────────────── */}
          <div
            ref={filtersRef}
            className="flex flex-wrap gap-3 mb-10"
          >
            {FILTERS.map(f => (
              <FilterPill
                key={f}
                label={f}
                active={filter === f}
                onClick={() => handleFilter(f)}
                cfg={f === 'All' ? { color: '#00d4ff' } : STATUS_CFG[f]}
              />
            ))}

            {/* Match count */}
            {!loading && (
              <span
                className="ml-auto self-center text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(148,163,184,0.8)',
                }}
              >
                {allShown.length} match{allShown.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {/* ── Live Now Section ──────────────────────────────────── */}
          {!loading && liveCount > 0 && (filter === 'All' || filter === 'LIVE') && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <RadarPing color="#00d4ff" />
                <span style={{ color: '#00d4ff', fontWeight: 800, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Live Now</span>
                <span style={{
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: 999, padding: '1px 10px', color: '#00d4ff', fontSize: 11, fontWeight: 800
                }}>{liveCount}</span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
                {liveMatches.map((match, i) => (
                  <MatchCard
                    key={`live-${animKey}-${match.id}`}
                    match={match}
                    index={i}
                    onScheduledClick={() => showToast("This match hasn't started yet. Please check back later.", 'warn')}
                    onCompletedClick={(m) => setResultMatch(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── All / Filtered Matches Grid ───────────────────────── */}
          <div
            ref={gridRef}
            className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
            style={{ perspective: '1200px' }}
          >
            {loading
              ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} i={i} />)
              : nonLiveShown.length === 0 && liveCount === 0
              ? (
                <div
                  className="col-span-full flex flex-col items-center justify-center py-32 rounded-3xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="mb-6 opacity-40">
                    <CricketBall size={64} />
                  </div>
                  <h3 className="font-black text-xl text-white mb-2 uppercase tracking-wide">
                    No Matches Found
                  </h3>
                  <p className="text-slate-400 font-light text-sm">
                    No {filter !== 'All' ? filter.toLowerCase() : ''} matches right now. Check back soon.
                  </p>
                </div>
              )
              : nonLiveShown.map((match, i) => (
                <MatchCard
                  key={`${animKey}-${match.id}`}
                  match={match}
                  index={i}
                  onScheduledClick={() => showToast("This match hasn't started yet. Please check back later.", 'warn')}
                  onCompletedClick={(m) => setResultMatch(m)}
                />
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Global CSS ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes spinGlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes blobDrift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(4%, 6%) scale(1.08); }
        }
        .match-card {
          transform-style: preserve-3d;
          transition: box-shadow 0.3s;
        }
        .match-card:hover > div {
          border-color: rgba(255,255,255,0.16) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .match-card, .filter-pill, .pitch-line { animation: none !important; transition: none !important; }
        }
      `}</style>
    </PageTransition>
  )
}