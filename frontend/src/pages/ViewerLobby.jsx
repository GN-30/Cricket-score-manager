import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Users, MapPin, Calendar, Zap, ArrowRight, Trophy, Loader2 } from 'lucide-react'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

const LS_KEY = 'cricket_viewer_name'

export default function ViewerLobby() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [match, setMatch]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [name, setName]           = useState(() => localStorage.getItem(LS_KEY) || '')
  const [nameError, setNameError] = useState('')
  const [joining, setJoining]     = useState(false)

  useEffect(() => {
    api.get(`/matches/${id}`)
      .then(({ data: { data } }) => setMatch(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleJoin = () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Please enter your display name'); return }
    if (trimmed.length < 2) { setNameError('Name must be at least 2 characters'); return }
    setNameError('')
    setJoining(true)
    localStorage.setItem(LS_KEY, trimmed)
    setTimeout(() => navigate(`/watch/${id}/live?name=${encodeURIComponent(trimmed)}`), 400)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin()
  }

  let displayFormat = match?.format ?? 'T20'
  try {
    const parsed = JSON.parse(match?.format)
    if (parsed?.overs) displayFormat = `${parsed.overs} Overs`
  } catch {}

  const isLive = match?.status === 'LIVE'

  return (
    <PageTransition>
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: '#060c1a' }}
      >
        {/* Background ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(57,255,20,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,184,0,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
          className="relative w-full max-w-lg z-10"
        >
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Trophy size={20} className="text-[#FFB800]" />
              <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">CricManager</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Join <span style={{ color: '#00D4FF' }}>Live</span> Match
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Watch the match and drop your commentary in real-time
            </p>
          </div>

          {/* Match Banner */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="animate-spin text-[#00D4FF]" />
            </div>
          ) : match ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 rounded-3xl p-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: isLive ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isLive ? '0 0 30px rgba(0,212,255,0.1)' : 'none',
              }}
            >
              {/* Live indicator */}
              {isLive && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex w-2.5 h-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D4FF]" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#00D4FF]">Live Now</span>
                </div>
              )}
              {!isLive && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{match.status}</span>
                </div>
              )}

              {/* Teams */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-xl font-black"
                    style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF' }}>
                    {match.homeTeam?.shortName?.[0] ?? '?'}
                  </div>
                  <p className="text-white font-black text-sm uppercase tracking-wider">{match.homeTeam?.shortName ?? 'HOME'}</p>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">{match.homeTeam?.name}</p>
                </div>

                <div className="text-center px-2">
                  <div className="text-2xl font-black italic text-slate-600">VS</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">{displayFormat}</div>
                </div>

                <div className="flex-1 text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-xl font-black"
                    style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.2)', color: '#FFB800' }}>
                    {match.awayTeam?.shortName?.[0] ?? '?'}
                  </div>
                  <p className="text-white font-black text-sm uppercase tracking-wider">{match.awayTeam?.shortName ?? 'AWAY'}</p>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">{match.awayTeam?.name}</p>
                </div>
              </div>

              {/* Score strip (live/completed) */}
              {match.score?.innings?.[0] && (
                <div className="mt-4 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm font-mono font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: '#00D4FF' }}>
                    {match.score.innings[0].totalRuns}/{match.score.innings[0].wickets}
                  </span>
                  <span className="text-slate-600 text-xs">SCORE</span>
                  <span className="text-slate-400">
                    {match.score.innings[1] ? `${match.score.innings[1].totalRuns}/${match.score.innings[1].wickets}` : '—'}
                  </span>
                </div>
              )}

              {/* Meta */}
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-slate-600" />
                  {match.venue ?? 'TBD'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-slate-600" />
                  {match.date ? new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8 text-slate-500">Match not found.</div>
          )}

          {/* Join Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl p-7"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Eye size={16} className="text-[#00D4FF]" />
              <h2 className="text-base font-black uppercase tracking-widest text-white">Enter as Viewer</h2>
            </div>

            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Your Display Name
            </label>
            <div className="relative mb-4">
              <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                onKeyDown={handleKeyDown}
                maxLength={40}
                placeholder="e.g. Ravi Kumar"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-600 text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: nameError ? '1px solid rgba(255,100,100,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: nameError ? '0 0 0 2px rgba(255,100,100,0.1)' : 'none',
                }}
              />
            </div>

            {nameError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs font-medium mb-4"
              >
                {nameError}
              </motion.p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #0099bb)',
                color: '#060c1a',
                boxShadow: '0 0 20px rgba(0,212,255,0.3)',
              }}
            >
              {joining ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  Join Commentary
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-600 mt-4 font-medium">
              No account needed · Public viewing · Free to comment
            </p>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
