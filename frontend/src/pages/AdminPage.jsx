import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Trophy, Users, Calendar, Plus, CheckCircle2,
  Loader2, ChevronDown, AlertTriangle, PlayCircle, XCircle, Clock,
  Eye, ArrowRight, ArrowLeft as ArrowLeftIcon, MapPin, Zap,
} from 'lucide-react'
import gsap from 'gsap'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'
import { useMatchWatchdog } from '@/hooks/useMatchWatchdog'

const TABS = [
  { id: 'teams',       label: 'Teams',       icon: ShieldAlert },
  { id: 'players',     label: 'Players',     icon: Users },
  { id: 'matches',     label: 'Matches',     icon: Calendar },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
]

/* ─── Overdue Countdown ─────────────────────────────────────────── */
function OverdueCountdown({ startedAt, abandonAfterMs, onExpire }) {
  const [remaining, setRemaining] = useState(abandonAfterMs)

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const left = Math.max(0, abandonAfterMs - elapsed)
      setRemaining(left)
      if (left === 0) {
        clearInterval(tick)
        onExpire?.()
      }
    }, 500)
    return () => clearInterval(tick)
  }, [startedAt, abandonAfterMs, onExpire])

  const totalSecs = Math.ceil(remaining / 1000)
  const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0')
  const secs = (totalSecs % 60).toString().padStart(2, '0')
  const pct  = (remaining / abandonAfterMs) * 100

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div
        className="text-2xl font-black font-mono tabular-nums"
        style={{ color: remaining < 120_000 ? '#f87171' : '#fbbf24' }}
      >
        {mins}:{secs}
      </div>
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: remaining < 120_000
              ? 'linear-gradient(90deg,#f87171,#ef4444)'
              : 'linear-gradient(90deg,#fbbf24,#f59e0b)',
          }}
        />
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
        until auto-abandon
      </p>
    </div>
  )
}

/* ─── Single Overdue Alert Card ─────────────────────────────────── */
function OverdueAlertCard({ alert, onStartNow, onAbandon, onCountdownExpire }) {
  const { match, startedAt } = alert
  const ABANDON_MS = 10 * 60 * 1000

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="relative rounded-2xl border overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0.6) 100%)',
        borderColor: 'rgba(239,68,68,0.4)',
        boxShadow: '0 0 30px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Pulsing top-line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)',
          backgroundSize: '200% 100%',
          animation: 'alertPulse 2s linear infinite',
        }}
      />

      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-400 animate-pulse" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5">
            Match Not Started — Action Required
          </p>
          <p className="font-black text-white text-sm truncate">
            {match.homeTeam?.shortName ?? '?'} vs {match.awayTeam?.shortName ?? '?'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <Clock size={10} /> Scheduled: {new Date(match.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>· {match.venue}</span>
          </div>
        </div>

        {/* Countdown */}
        <OverdueCountdown
          startedAt={startedAt}
          abandonAfterMs={ABANDON_MS}
          onExpire={onCountdownExpire}
        />
      </div>

      {/* Actions */}
      <div
        className="flex gap-3 px-5 py-3 border-t"
        style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(0,0,0,0.2)' }}
      >
        <button
          onClick={onStartNow}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #00d4ff22, #00d4ff11)',
            border: '1px solid rgba(0,212,255,0.4)',
            color: '#00d4ff',
            boxShadow: '0 0 16px rgba(0,212,255,0.15)',
          }}
        >
          <PlayCircle size={14} /> Start Now
        </button>
        <button
          onClick={onAbandon}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
          }}
        >
          <XCircle size={14} /> Abandon
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Overdue Alerts Panel ──────────────────────────────────────── */
function OverdueAlertsPanel({ alerts, onStartNow, onAbandon, onCountdownExpire }) {
  if (!alerts.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-8 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-red-400" />
        <span className="text-xs font-black uppercase tracking-widest text-red-400">
          {alerts.length} Overdue Match{alerts.length > 1 ? 'es' : ''}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => (
            <OverdueAlertCard
              key={alert.match.id}
              alert={alert}
              onStartNow={() => onStartNow(alert)}
              onAbandon={() => onAbandon(alert)}
              onCountdownExpire={() => onCountdownExpire(alert)}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── Admin Page ────────────────────────────────────────────────── */
export default function AdminPage() {
  const containerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('teams')
  const [teams, setTeams] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // { id → { match, startedAt } }
  const [overdueAlerts, setOverdueAlerts] = useState({})

  const [teamForm, setTeamForm] = useState({ name: '', shortName: '', logoUrl: '' })
  const [playerForm, setPlayerForm] = useState({ name: '', teamId: '', role: 'BATSMAN' })
  const [matchForm, setMatchForm] = useState({ homeTeamId: '', awayTeamId: '', venue: '', date: '', overs: 20, playersPerTeam: 11, status: 'SCHEDULED', matchType: '' })

  const TOURNAMENT_DEFAULTS = { name: '', venue: '', startDate: '', endDate: '', format: 'ROUND_ROBIN', teams: [], overs: 20, playersPerTeam: 11, matchesPerDay: 1, matchStartTime: '14:00', gapHours: 0.5 }
  const [tournamentForm, setTournamentForm] = useState(TOURNAMENT_DEFAULTS)
  // Step 1 = form, Step 2 = preview
  const [tournamentStep, setTournamentStep] = useState(1)
  const [fixturePreview, setFixturePreview] = useState([]) // [{ home, away, date }]

  /* ── Scheduling helpers ── */
  const generateFixturePairs = (selectedTeams, format) => {
    const pairs = []
    if (['ROUND_ROBIN', 'COMBINATION', 'TOUR'].includes(format)) {
      for (let i = 0; i < selectedTeams.length; i++)
        for (let j = i + 1; j < selectedTeams.length; j++)
          pairs.push({ home: selectedTeams[i], away: selectedTeams[j] })
    } else if (format === 'KNOCKOUT') {
      const shuffled = [...selectedTeams].sort(() => 0.5 - Math.random())
      for (let i = 0; i < shuffled.length; i += 2)
        if (shuffled[i + 1]) pairs.push({ home: shuffled[i], away: shuffled[i + 1] })
    }
    return pairs
  }

  const generateSlots = (startDate, endDate, matchesPerDay, matchStartTime, gapHours) => {
    const slots = []
    const [startH, startM] = matchStartTime.split(':').map(Number)
    const end = new Date(endDate)
    const current = new Date(startDate)
    // Set only the date portion of current, keep start time
    current.setHours(startH, startM, 0, 0)

    while (current <= end) {
      for (let i = 0; i < matchesPerDay; i++) {
        const slot = new Date(current)
        slot.setHours(slot.getHours() + i * gapHours)
        if (slot <= end) slots.push(new Date(slot))
      }
      current.setDate(current.getDate() + 1)
    }
    return slots
  }

  const handlePreviewFixtures = (e) => {
    e.preventDefault()
    const { teams: selectedTeams, format, startDate, endDate, matchesPerDay, matchStartTime, gapHours } = tournamentForm
    if (selectedTeams.length < 2) { setErrorMsg('Select at least 2 teams.'); return }
    if (!startDate) { setErrorMsg('Start date is required.'); return }
    setErrorMsg('')

    const pairs = generateFixturePairs(selectedTeams, format)
    const effectiveEndDate = endDate || startDate  // fallback: spread over start day only
    const slots = generateSlots(startDate, effectiveEndDate, Number(matchesPerDay), matchStartTime, Number(gapHours))

    if (slots.length < pairs.length) {
      setErrorMsg(`Not enough match slots! Need ${pairs.length} slots but only ${slots.length} available. Extend the end date or increase matches per day.`)
      return
    }

    const preview = pairs.map((pair, idx) => ({ ...pair, date: slots[idx] }))
    setFixturePreview(preview)
    setTournamentStep(2)
  }

  useEffect(() => {
    api.get('/teams').then(res => setTeams(res.data?.data || []))
  }, [successMsg])

  /* ── GSAP Entry Animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.fromTo('.admin-header',
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      )
      .fromTo('.admin-tab',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
        '-=0.4'
      )
      .fromTo('.admin-card',
        { scale: 0.95, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.2)' },
        '-=0.2'
      )
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray('form > *')
      if (!elements.length) return
      gsap.fromTo(elements,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [activeTab])

  /* ── Watchdog ── */
  const handleOverdue = useCallback((match) => {
    setOverdueAlerts(prev => ({
      ...prev,
      [match.id]: { match, startedAt: Date.now() },
    }))
  }, [])

  const handleAutoAbandoned = useCallback((matchId) => {
    setOverdueAlerts(prev => {
      const next = { ...prev }
      delete next[matchId]
      return next
    })
    setSuccessMsg('Match auto-abandoned after 10-minute timeout.')
  }, [])

  const { dismissTimer } = useMatchWatchdog({
    onOverdue: handleOverdue,
    onAbandoned: handleAutoAbandoned,
  })

  const dismissAlert = useCallback((matchId) => {
    dismissTimer(matchId)
    setOverdueAlerts(prev => {
      const next = { ...prev }
      delete next[matchId]
      return next
    })
  }, [dismissTimer])

  const handleStartNow = useCallback(async (alert) => {
    const { match } = alert
    try {
      await api.put(`/matches/${match.id}`, { status: 'LIVE' })
      dismissAlert(match.id)
      setSuccessMsg(`Match ${match.homeTeam?.shortName} vs ${match.awayTeam?.shortName} is now LIVE!`)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start match')
    }
  }, [dismissAlert])

  const handleAbandon = useCallback(async (alert) => {
    const { match } = alert
    try {
      await api.put(`/matches/${match.id}`, { status: 'ABANDONED' })
      dismissAlert(match.id)
      setSuccessMsg(`Match ${match.homeTeam?.shortName} vs ${match.awayTeam?.shortName} marked as Abandoned.`)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to abandon match')
    }
  }, [dismissAlert])

  const handleCountdownExpire = useCallback((alert) => {
    // The watchdog already fires the API call; we just clean up UI
    dismissAlert(alert.match.id)
  }, [dismissAlert])

  /* ── Form Submit ── */
  const handleSubmit = async (e, type) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      if (type === 'teams') {
        await api.post('/teams', teamForm)
        setSuccessMsg('Team added successfully!')
        setTeamForm({ name: '', shortName: '', logoUrl: '' })
      } else if (type === 'players') {
        await api.post('/players', playerForm)
        setSuccessMsg('Player added successfully!')
        setPlayerForm({ name: '', teamId: '', role: 'BATSMAN' })
      } else if (type === 'matches') {
        if (matchForm.homeTeamId === matchForm.awayTeamId) {
          throw new Error('Home and Away teams cannot be the same')
        }
        const payload = {
          ...matchForm,
          format: JSON.stringify({ overs: Number(matchForm.overs), playersPerTeam: Number(matchForm.playersPerTeam) }),
        }
        delete payload.overs
        delete payload.playersPerTeam
        if (!payload.matchType) delete payload.matchType
        await api.post('/matches', payload)
        setSuccessMsg('Match scheduled successfully!')
        setMatchForm({ homeTeamId: '', awayTeamId: '', venue: '', date: '', overs: 20, playersPerTeam: 11, status: 'SCHEDULED', matchType: '' })
      } else if (type === 'tournaments') {
        // fixturePreview already built in step 1 — just confirm and save
        const settings = { overs: Number(tournamentForm.overs), playersPerTeam: Number(tournamentForm.playersPerTeam) }
        const res = await api.post('/tournaments', {
          name: tournamentForm.name,
          startDate: tournamentForm.startDate,
          endDate: tournamentForm.endDate || null,
          format: tournamentForm.format,
          teams: tournamentForm.teams,
          settings,
        })
        const tId = res.data.data.id
        const formatString = JSON.stringify(settings)
        for (const m of fixturePreview) {
          await api.post('/matches', {
            homeTeamId: m.home,
            awayTeamId: m.away,
            venue: tournamentForm.venue || 'Tournament Venue',
            date: m.date.toISOString(),
            format: formatString,
            tournamentId: tId,
            status: 'SCHEDULED',
          })
        }
        setSuccessMsg(`Tournament & ${fixturePreview.length} fixtures created successfully!`)
        setTournamentForm(TOURNAMENT_DEFAULTS)
        setFixturePreview([])
        setTournamentStep(1)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
      setTimeout(() => setSuccessMsg(''), 4000)
    }
  }

  const alertList = Object.values(overdueAlerts)

  return (
    <PageTransition>
      <div ref={containerRef} className="container mx-auto px-4 py-12 relative z-10 max-w-4xl">

        {/* ── Header ── */}
        <div className="admin-header mb-10 flex items-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-1">
              Admin <span className="text-red-500">Dashboard</span>
            </h1>
            <p className="text-slate-400 font-light">Manage your cricket data and roster.</p>
          </div>
        </div>

        {/* ── Overdue Alerts ── */}
        <AnimatePresence>
          {alertList.length > 0 && (
            <OverdueAlertsPanel
              key="overdue-panel"
              alerts={alertList}
              onStartNow={handleStartNow}
              onAbandon={handleAbandon}
              onCountdownExpire={handleCountdownExpire}
            />
          )}
        </AnimatePresence>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`admin-tab flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Notifications ── */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
              {errorMsg}
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 size={18} /> {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ── */}
        <div className="admin-card glass-card p-8 border border-white/10 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <form onSubmit={(e) => handleSubmit(e, 'teams')} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide text-white mb-6">Add New Team</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Team Name</label>
                  <input required type="text" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="e.g. Chennai Super Kings" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Short Name</label>
                  <input required type="text" maxLength={4} value={teamForm.shortName} onChange={e => setTeamForm({...teamForm, shortName: e.target.value.toUpperCase()})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors uppercase" placeholder="e.g. CSK" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Logo URL (Optional)</label>
                <input type="url" value={teamForm.logoUrl} onChange={e => setTeamForm({...teamForm, logoUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="https://..." />
              </div>
              <button disabled={isLoading} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl uppercase tracking-widest transition-colors disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                Create Team
              </button>
            </form>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <form onSubmit={(e) => handleSubmit(e, 'players')} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide text-white mb-6">Add New Player</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Player Name</label>
                  <input required type="text" value={playerForm.name} onChange={e => setPlayerForm({...playerForm, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="e.g. MS Dhoni" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Team</label>
                  <div className="relative group">
                    <select required value={playerForm.teamId} onChange={e => setPlayerForm({...playerForm, teamId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                      <option value="" disabled className="bg-slate-900">Select a team</option>
                      {teams.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name} ({t.shortName})</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role</label>
                <div className="relative group">
                  <select required value={playerForm.role} onChange={e => setPlayerForm({...playerForm, role: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                    <option value="BATSMAN" className="bg-slate-900">Batsman</option>
                    <option value="BOWLER" className="bg-slate-900">Bowler</option>
                    <option value="ALL_ROUNDER" className="bg-slate-900">All Rounder</option>
                    <option value="WICKET_KEEPER" className="bg-slate-900">Wicket Keeper</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                </div>
              </div>
              <button disabled={isLoading} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl uppercase tracking-widest transition-colors disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                Add Player
              </button>
            </form>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <form onSubmit={e => handleSubmit(e, 'matches')} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-wide text-white mb-6">Schedule Match</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Home Team</label>
                  <div className="relative group">
                    <select required value={matchForm.homeTeamId} onChange={e => setMatchForm({...matchForm, homeTeamId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                      <option value="" disabled className="bg-slate-900">Select Home Team</option>
                      {teams.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Away Team</label>
                  <div className="relative group">
                    <select required value={matchForm.awayTeamId} onChange={e => setMatchForm({...matchForm, awayTeamId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                      <option value="" disabled className="bg-slate-900">Select Away Team</option>
                      {teams.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue</label>
                  <input required type="text" value={matchForm.venue} onChange={e => setMatchForm({...matchForm, venue: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="e.g. Wankhede Stadium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date & Time</label>
                  <input required type="datetime-local" value={matchForm.date} onChange={e => setMatchForm({...matchForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors [color-scheme:dark]" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Number of Overs</label>
                  <input required type="number" min="1" max="100" value={matchForm.overs} onChange={e => setMatchForm({...matchForm, overs: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Players per Team</label>
                  <input required type="number" min="2" max="20" value={matchForm.playersPerTeam} onChange={e => setMatchForm({...matchForm, playersPerTeam: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    Note: If players &gt; 5, no last man allowed. If &le; 5, last man allowed.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <div className="relative group">
                    <select required value={matchForm.status} onChange={e => setMatchForm({...matchForm, status: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                      <option value="SCHEDULED" className="bg-slate-900">Scheduled</option>
                      <option value="LIVE" className="bg-slate-900">Live</option>
                      <option value="COMPLETED" className="bg-slate-900">Completed</option>
                      <option value="ABANDONED" className="bg-slate-900">Abandoned</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Match Type <span className="normal-case text-slate-600 font-medium">(for playoffs)</span></label>
                  <div className="relative group">
                    <select value={matchForm.matchType} onChange={e => setMatchForm({...matchForm, matchType: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer group-hover:border-white/20">
                      <option value="" className="bg-slate-900">Group Stage (default)</option>
                      <option value="SEMIFINAL" className="bg-slate-900">Semi Final</option>
                      <option value="SEMIFINAL_1" className="bg-slate-900">Semi Final 1</option>
                      <option value="SEMIFINAL_2" className="bg-slate-900">Semi Final 2</option>
                      <option value="FINAL" className="bg-slate-900">🏆 Final</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 group-hover:text-red-400 transition-colors" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Playoff matches appear in the Playoffs tab of the tournament.</p>
                </div>
              </div>

              <button disabled={isLoading} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl uppercase tracking-widest transition-colors disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                Schedule Match
              </button>
            </form>
          )}

          {/* Tournaments Tab — 2-Step Form */}
          {activeTab === 'tournaments' && (
            <div>
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-8">
                {[{ n: 1, label: 'Details' }, { n: 2, label: 'Preview & Confirm' }].map(({ n, label }, idx) => (
                  <>
                    <div key={n} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                      tournamentStep === n
                        ? 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40'
                        : tournamentStep > n
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-white/5 text-slate-500 border-white/10'
                    }`}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border" style={{ borderColor: 'currentColor' }}>{tournamentStep > n ? '✓' : n}</span>
                      {label}
                    </div>
                    {idx === 0 && <div className="flex-1 h-px bg-white/10" />}
                  </>
                ))}
              </div>

              {/* ── STEP 1: Tournament Details ── */}
              {tournamentStep === 1 && (
                <form onSubmit={handlePreviewFixtures} className="space-y-6">
                  <h2 className="text-xl font-black uppercase tracking-wide text-white mb-2">Tournament Details</h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Name</label>
                      <input required type="text" value={tournamentForm.name} onChange={e => setTournamentForm({...tournamentForm, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="e.g. IPL 2026" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><MapPin size={11} className="inline mr-1" />Venue (for all matches)</label>
                      <input required type="text" value={tournamentForm.venue} onChange={e => setTournamentForm({...tournamentForm, venue: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" placeholder="e.g. Wankhede Stadium" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Start Date & Time</label>
                      <input required type="datetime-local" value={tournamentForm.startDate} onChange={e => setTournamentForm({...tournamentForm, startDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament End Date</label>
                      <input required type="datetime-local" value={tournamentForm.endDate} onChange={e => setTournamentForm({...tournamentForm, endDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors [color-scheme:dark]" />
                      <p className="text-[10px] text-slate-500 mt-1">Fixtures are spread between start & end.</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Format</label>
                      <div className="relative group">
                        <select required value={tournamentForm.format} onChange={e => setTournamentForm({...tournamentForm, format: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none cursor-pointer">
                          <option value="ROUND_ROBIN" className="bg-slate-900">Round Robin</option>
                          <option value="KNOCKOUT" className="bg-slate-900">Knockout</option>
                          <option value="COMBINATION" className="bg-slate-900">Combination (League + Knockout)</option>
                          <option value="TOUR" className="bg-slate-900">Tour / Series</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Teams</label>
                      <div className="bg-black/40 border border-white/10 rounded-xl max-h-40 overflow-y-auto p-2">
                        {teams.map(t => (
                          <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={tournamentForm.teams.includes(t.id)}
                              onChange={(e) => {
                                const newTeams = e.target.checked ? [...tournamentForm.teams, t.id] : tournamentForm.teams.filter(id => id !== t.id)
                                setTournamentForm({...tournamentForm, teams: newTeams})
                              }}
                              className="accent-[#00d4ff] w-4 h-4 rounded border-white/20 bg-transparent"
                            />
                            <span className="text-white text-sm font-medium">{t.name}</span>
                          </label>
                        ))}
                      </div>
                      {tournamentForm.teams.length > 0 && (
                        <p className="text-[10px] text-[#00d4ff] mt-1 font-bold">
                          {tournamentForm.teams.length} teams selected · {Math.round(tournamentForm.teams.length * (tournamentForm.teams.length - 1) / 2)} round-robin fixtures
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Match Timing */}
                  <div className="p-4 rounded-2xl border border-[#00d4ff]/20 bg-[#00d4ff]/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00d4ff] mb-4 flex items-center gap-1.5"><Zap size={11} /> Match Scheduling</p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Matches per Day</label>
                        <input required type="number" min="1" max="10" value={tournamentForm.matchesPerDay} onChange={e => setTournamentForm({...tournamentForm, matchesPerDay: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4ff]/50 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">1st Match Start Time</label>
                        <input required type="time" value={tournamentForm.matchStartTime} onChange={e => setTournamentForm({...tournamentForm, matchStartTime: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4ff]/50 transition-colors [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gap Between Matches (hrs)</label>
                        <input type="number" min="0.5" max="24" step="0.5" value={tournamentForm.gapHours}
                          disabled={Number(tournamentForm.matchesPerDay) < 2}
                          onChange={e => setTournamentForm({...tournamentForm, gapHours: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4ff]/50 transition-colors disabled:opacity-40" />
                        {Number(tournamentForm.matchesPerDay) < 2 && <p className="text-[10px] text-slate-500 mt-1">Only used when matches/day &gt; 1</p>}
                        {Number(tournamentForm.matchesPerDay) >= 2 && <p className="text-[10px] text-slate-500 mt-1">Min 0.5 hr (30 min) · Max 24 hrs · steps of 30 min</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Overs per Match</label>
                      <input required type="number" min="1" max="100" value={tournamentForm.overs} onChange={e => setTournamentForm({...tournamentForm, overs: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Players per Team</label>
                      <input required type="number" min="2" max="20" value={tournamentForm.playersPerTeam} onChange={e => setTournamentForm({...tournamentForm, playersPerTeam: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,212,255,0.3)]">
                    <Eye size={18} /> Preview Fixtures <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* ── STEP 2: Fixture Preview ── */}
              {tournamentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-wide text-white">Fixture Schedule Preview</h2>
                    <button onClick={() => setTournamentStep(1)} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-bold transition-colors">
                      <ArrowLeftIcon size={14} /> Back
                    </button>
                  </div>

                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: tournamentForm.name, color: '#00d4ff' },
                      { label: `${fixturePreview.length} Fixtures`, color: '#39ff8e' },
                      { label: tournamentForm.venue, color: '#fbbf24' },
                      { label: `${tournamentForm.overs} Overs`, color: '#a78bfa' },
                    ].map(chip => (
                      <span key={chip.label} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                        style={{ color: chip.color, borderColor: chip.color + '40', background: chip.color + '12' }}>
                        {chip.label}
                      </span>
                    ))}
                  </div>

                  {/* Fixture table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/30">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white/5">
                          <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="p-3 pl-5 text-left">#</th>
                            <th className="p-3 text-left">Home</th>
                            <th className="p-3 text-center">vs</th>
                            <th className="p-3 text-left">Away</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 pr-5 text-left">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {fixturePreview.map((f, idx) => {
                            const homeTeam = teams.find(t => t.id === f.home)
                            const awayTeam = teams.find(t => t.id === f.away)
                            return (
                              <tr key={idx} className="hover:bg-white/3 transition-colors">
                                <td className="p-3 pl-5 font-black text-slate-500 text-xs">{idx + 1}</td>
                                <td className="p-3">
                                  <span className="font-bold text-white">{homeTeam?.shortName}</span>
                                  <span className="text-slate-500 text-xs ml-1.5">{homeTeam?.name}</span>
                                </td>
                                <td className="p-3 text-center text-slate-600 font-black text-xs">VS</td>
                                <td className="p-3">
                                  <span className="font-bold text-white">{awayTeam?.shortName}</span>
                                  <span className="text-slate-500 text-xs ml-1.5">{awayTeam?.name}</span>
                                </td>
                                <td className="p-3 text-slate-300 font-medium text-xs">
                                  {f.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="p-3 pr-5 text-[#00d4ff] font-black text-xs">
                                  {f.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    All {fixturePreview.length} matches will be created at <span className="text-white font-bold">{tournamentForm.venue}</span>. This cannot be undone.
                  </p>

                  <form onSubmit={e => handleSubmit(e, 'tournaments')}>
                    <button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_rgba(57,255,142,0.3)]">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 size={18} /> Confirm & Create Tournament</>}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alert animation keyframe */}
      <style>{`
        @keyframes alertPulse {
          0%   { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </PageTransition>
  )
}
