import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Trophy, MapPin, Calendar, Zap, Share2, Check,
  Circle, Target, Shield, Disc, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'
import CommentaryFeed from '@/components/CommentaryFeed'

const LS_KEY      = 'cricket_viewer_name'
const fmtOvers    = (b) => `${Math.floor(b / 6)}.${b % 6}`
const calcSR      = (r, b) => b > 0 ? ((r / b) * 100).toFixed(1) : '0.0'
const calcEco     = (r, b) => b > 0 ? ((r / b) * 6).toFixed(2) : '0.00'

/* ── helpers ── */
function Pill({ label, value, hi }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="text-xs font-black mt-0.5" style={{ color: hi || '#cbd5e1' }}>{value ?? 0}</div>
    </div>
  )
}

function SectionHead({ icon: Icon, color, label }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon size={12} style={{ color }} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  )
}

/* ── Scoreboard ── */
function Scoreboard({ match, score, players }) {
  /* ── always show match banner even with no score ── */
  const matchInfo = (
    <div className="rounded-2xl p-4 grid grid-cols-2 gap-3 mb-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {[
        { label: 'Venue',  val: match.venue ?? 'TBD',    Icon: MapPin },
        { label: 'Date',   val: match.date ? new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—', Icon: Calendar },
        { label: 'Teams',  val: `${match.homeTeam?.shortName ?? '?'} vs ${match.awayTeam?.shortName ?? '?'}`, Icon: null },
        { label: 'Format', val: (() => { try { const p = JSON.parse(match.format ?? '{}'); return p.overs ? `${p.overs} Overs` : match.format } catch { return match.format ?? 'T20' } })(), Icon: null },
      ].map(({ label, val, Icon }) => (
        <div key={label}>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">{label}</p>
          <p className="text-slate-400 text-xs font-semibold flex items-center gap-1">
            {Icon && <Icon size={10} className="text-slate-600" />}{val}
          </p>
        </div>
      ))}
    </div>
  )

  if (!score) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Zap size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-bold text-sm">Waiting for play to begin</p>
          <p className="text-slate-600 text-xs mt-1">Scoreboard will appear once the admin starts scoring</p>
        </div>
        {matchInfo}
      </div>
    )
  }

  const innIdx      = score.currentInningsIndex ?? 0
  const inn         = score.innings?.[innIdx]
  const inn0        = score.innings?.[0]
  const isSecond    = innIdx === 1

  let matchOvers = 20
  try { const p = JSON.parse(match.format ?? '{}'); if (p?.overs) matchOvers = Number(p.overs) } catch {}

  const target    = isSecond && inn0 ? inn0.totalRuns + 1 : null
  const runsLeft  = target ? target - (inn?.totalRuns ?? 0) : null
  const ballsLeft = matchOvers * 6 - (inn?.balls ?? 0)
  const currRR    = inn?.balls > 0 ? ((inn.totalRuns / inn.balls) * 6).toFixed(2) : '—'
  const reqRR     = target && ballsLeft > 0 ? ((runsLeft / ballsLeft) * 6).toFixed(2) : null

  const batTeamId  = inn?.teamId
  const batTeam    = batTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam
  const bowlTeam   = batTeamId === match.homeTeamId ? match.awayTeam : match.homeTeam

  const pMap = Object.fromEntries(players.map(p => [p.id, p.name]))

  const sId  = score.currentStrikerId    || ''
  const nsId = score.currentNonStrikerId || ''
  const bId  = score.currentBowlerId     || ''

  // Batting first team (from innings[0].teamId)
  const batFirstId   = inn0?.teamId
  const batFirstTeam = batFirstId === match.homeTeamId ? match.homeTeam : match.awayTeam
  const fldFirstTeam = batFirstId === match.homeTeamId ? match.awayTeam  : match.homeTeam

  const ballsThisOver = inn ? inn.balls % 6 : 0

  return (
    <div className="space-y-4">

      {/* Toss / batting first */}
      {batFirstId && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)' }}>
          <span className="text-xl">🪙</span>
          <p className="text-xs font-semibold text-slate-300 leading-relaxed">
            <span className="text-[#FFB800] font-black">{batFirstTeam?.name ?? 'Team A'}</span>
            {' '}elected to bat first
            {fldFirstTeam?.name && (
              <span className="text-slate-500 font-medium"> · {fldFirstTeam.name} fielding</span>
            )}
          </p>
        </div>
      )}

      {/* Main score card */}
      <motion.div
        key={`${inn?.totalRuns}-${inn?.wickets}`}
        animate={{ scale: [1, 1.012, 1] }}
        transition={{ duration: 0.2 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.07) 0%, rgba(7,12,26,0.98) 65%)',
          border: match.status === 'LIVE' ? '1px solid rgba(0,212,255,0.28)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: match.status === 'LIVE' ? '0 0 50px rgba(0,212,255,0.06)' : 'none',
        }}
      >
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          {match.status === 'LIVE' ? (
            <div className="flex items-center gap-2">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00D4FF]" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#00D4FF]">
                Live · Innings {innIdx + 1}
              </span>
            </div>
          ) : match.status === 'COMPLETED' ? (
            <div className="flex items-center gap-2">
              <Trophy size={13} className="text-[#FFB800]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFB800]">Match Completed</span>
            </div>
          ) : <div />}
          <div className="text-right">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">CRR</div>
            <div className="text-sm font-black text-slate-300">{currRR}</div>
          </div>
        </div>

        {/* Big score */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-1">
              {batTeam?.name ?? 'Batting'}
            </p>
            <div className="flex items-end gap-1">
              <span className="text-6xl font-black text-white leading-none" style={{ letterSpacing: '-0.03em' }}>
                {inn?.totalRuns ?? 0}
              </span>
              <span className="text-3xl font-black text-slate-500 pb-1">/{inn?.wickets ?? 0}</span>
            </div>
            <p className="text-slate-400 text-sm font-mono mt-1">{fmtOvers(inn?.balls ?? 0)} overs</p>
          </div>
          <div className="text-right">
            <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold mb-1">Bowling</p>
            <p className="text-slate-300 font-bold text-sm">{bowlTeam?.shortName ?? '—'}</p>
          </div>
        </div>

        {/* Over progress */}
        {match.status === 'LIVE' && inn && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mr-1">Over</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{
                  background: i < ballsThisOver ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: i < ballsThisOver ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  color: i < ballsThisOver ? '#00D4FF' : 'rgba(255,255,255,0.15)',
                }}>
                {i < ballsThisOver ? '•' : ''}
              </div>
            ))}
          </div>
        )}

        {/* Target chase bar */}
        {target && match.status === 'LIVE' && (
          <div className="mt-4 rounded-xl px-4 py-3 grid grid-cols-3 text-center gap-2"
            style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.18)' }}>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Target</p>
              <p className="text-[#FFB800] font-black text-xl">{target}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Need</p>
              <p className="text-white font-black text-xl">{runsLeft}</p>
              <p className="text-slate-500 text-[10px]">in {ballsLeft}b</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Req RR</p>
              <p className="font-black text-xl"
                style={{ color: reqRR > 12 ? '#ff6b6b' : reqRR > 9 ? '#FFB800' : '#39FF14' }}>
                {reqRR}
              </p>
            </div>
          </div>
        )}

        {/* 1st innings recap */}
        {isSecond && inn0 && (
          <div className="mt-3 rounded-xl px-4 py-2 flex items-center justify-between text-xs font-mono font-bold"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-slate-500">
              {inn0.teamId === match.homeTeamId ? match.homeTeam?.shortName : match.awayTeam?.shortName} (1st Innings)
            </span>
            <span className="text-slate-300">{inn0.totalRuns}/{inn0.wickets} ({fmtOvers(inn0.balls)} ov)</span>
          </div>
        )}
      </motion.div>

      {/* At the Crease */}
      {(sId || nsId) && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <SectionHead icon={Target} color="#00D4FF" label="At the Crease" />
          <div className="space-y-0">
            {[
              { pid: sId,  isStriker: true,  stats: inn?.batsmen?.[sId]  },
              { pid: nsId, isStriker: false, stats: inn?.batsmen?.[nsId] },
            ].filter(r => r.pid).map(({ pid, isStriker, stats }) => (
              <div key={pid} className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  {isStriker
                    ? <span className="text-[#00D4FF] font-black text-xs flex-shrink-0">★</span>
                    : <span className="w-3 flex-shrink-0" />}
                  <span className={`text-sm font-bold truncate ${isStriker ? 'text-white' : 'text-slate-400'}`}>
                    {pMap[pid] ?? pid}
                  </span>
                  {isStriker && (
                    <span className="text-[10px] font-black text-[#00D4FF] bg-[#00D4FF]/10 px-1.5 rounded ml-1 flex-shrink-0">
                      STRIKE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Pill label="R"  value={stats?.runs ?? 0}  hi={isStriker ? '#fff' : undefined} />
                  <Pill label="B"  value={stats?.balls ?? 0} />
                  <Pill label="4s" value={stats?.fours ?? 0} />
                  <Pill label="6s" value={stats?.sixes ?? 0} />
                  <Pill label="SR" value={calcSR(stats?.runs ?? 0, stats?.balls ?? 0)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Bowler */}
      {bId && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.12)' }}>
          <SectionHead icon={Shield} color="#FFB800" label="Current Bowler" />
          {(() => {
            const stats = inn?.bowlers?.[bId]
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#FFB800] font-black text-xs">⬤</span>
                  <span className="text-sm font-bold text-white truncate">{pMap[bId] ?? bId}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Pill label="O"   value={fmtOvers(stats?.balls ?? 0)} hi="#FFB800" />
                  <Pill label="R"   value={stats?.runs ?? 0} />
                  <Pill label="W"   value={stats?.wickets ?? 0} hi={(stats?.wickets ?? 0) > 0 ? '#39FF14' : undefined} />
                  <Pill label="Eco" value={calcEco(stats?.runs ?? 0, stats?.balls ?? 0)} />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Full scorecard per innings */}
      {score.innings?.map((innData, idx) => {
        const batEntries  = Object.entries(innData.batsmen  ?? {})
        const bowlEntries = Object.entries(innData.bowlers  ?? {})
        if (!batEntries.length && !bowlEntries.length) return null

        const innTeam = innData.teamId === match.homeTeamId ? match.homeTeam : match.awayTeam
        const isCurrentInn = idx === innIdx

        return (
          <div key={idx} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {idx + 1}{idx === 0 ? 'st' : 'nd'} Innings ·
                </span>
                <span className="text-white font-black text-sm">{innTeam?.shortName ?? `Team ${idx + 1}`}</span>
              </div>
              <span className="font-black text-sm font-mono text-white">
                {innData.totalRuns}/{innData.wickets}
                <span className="text-slate-500 text-xs font-medium ml-1">({fmtOvers(innData.balls)} ov)</span>
              </span>
            </div>

            {/* Batting table */}
            {batEntries.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Batting</p>
                <div className="grid grid-cols-6 text-[9px] font-bold uppercase tracking-widest text-slate-600 pb-1 mb-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="col-span-2">Batter</span>
                  <span className="text-center">R</span>
                  <span className="text-center">B</span>
                  <span className="text-center">4s</span>
                  <span className="text-center">6s</span>
                </div>
                {batEntries.map(([pid, st]) => (
                  <div key={pid} className="grid grid-cols-6 items-center text-xs py-1.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <span className="col-span-2 font-semibold text-slate-300 truncate flex items-center gap-1.5">
                      {pid === sId && isCurrentInn && (
                        <span className="text-[#00D4FF] font-black text-[10px]">★</span>
                      )}
                      {pMap[pid] ?? pid}
                    </span>
                    <span className="text-center font-black text-white">{st.runs ?? 0}</span>
                    <span className="text-center text-slate-400">{st.balls ?? 0}</span>
                    <span className="text-center text-slate-400">{st.fours ?? 0}</span>
                    <span className="text-center text-slate-400">{st.sixes ?? 0}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bowling table */}
            {bowlEntries.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Bowling</p>
                <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-widest text-slate-600 pb-1 mb-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="col-span-2">Bowler</span>
                  <span className="text-center">O</span>
                  <span className="text-center">R</span>
                  <span className="text-center">W</span>
                </div>
                {bowlEntries.map(([pid, st]) => (
                  <div key={pid} className="grid grid-cols-5 items-center text-xs py-1.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <span className="col-span-2 font-semibold text-slate-300 truncate flex items-center gap-1.5">
                      {pid === bId && isCurrentInn && (
                        <span className="text-[#FFB800] font-black text-[10px]">⬤</span>
                      )}
                      {pMap[pid] ?? pid}
                    </span>
                    <span className="text-center font-mono text-slate-400">{fmtOvers(st.balls ?? 0)}</span>
                    <span className="text-center text-slate-400">{st.runs ?? 0}</span>
                    <span className="text-center font-black"
                      style={{ color: (st.wickets ?? 0) > 0 ? '#39FF14' : '#64748b' }}>
                      {st.wickets ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {matchInfo}

      {/* Winner */}
      {match.status === 'COMPLETED' && score?.winnerId && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg,rgba(57,255,20,0.1),rgba(57,255,20,0.03))', border: '1px solid rgba(57,255,20,0.25)' }}>
          <Trophy size={28} className="text-[#FFB800] mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Winner</p>
          <p className="text-xl font-black text-white">
            {score.winnerId === 'TIE'
              ? 'Match Tied!'
              : ((score.winnerId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name) ?? 'Winner') + ' Win!'}
          </p>
        </motion.div>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function LiveMatchView() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const [sp]           = useSearchParams()
  const viewerName     = sp.get('name') || localStorage.getItem(LS_KEY) || 'Viewer'

  const [match,   setMatch]   = useState(null)
  const [score,   setScore]   = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [comments, setComments]     = useState([])
  const [text,     setText]         = useState('')
  const [sending,  setSending]      = useState(false)
  const [copied,   setCopied]       = useState(false)

  /* ── fetch ── */
  const load = useCallback(async () => {
    try {
      // 1. Match
      const mRes = await api.get(`/matches/${id}`)
      const m    = mRes.data?.data ?? mRes.data
      if (!m) throw new Error('Match not found')
      setMatch(m)
      if (m.score) setScore(m.score)

      // 2. Players (for name lookup) — non-blocking, failures are ok
      try {
        const [hRes, aRes] = await Promise.all([
          api.get(`/players?teamId=${m.homeTeamId}`),
          api.get(`/players?teamId=${m.awayTeamId}`),
        ])
        const hp = hRes.data?.data ?? hRes.data ?? []
        const ap = aRes.data?.data ?? aRes.data ?? []
        setPlayers([...hp, ...ap])
      } catch { /* players unavailable, show IDs */ }

      // 3. Comments
      const cRes = await api.get(`/comments?matchId=${id}`)
      setComments(cRes.data?.data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  /* ── Polling fallback — refresh match data every 5s for reliability ── */
  useEffect(() => {
    // Only poll when match is LIVE or SCHEDULED (not needed for COMPLETED)
    const poll = async () => {
      try {
        const mRes = await api.get(`/matches/${id}`)
        const m    = mRes.data?.data ?? mRes.data
        if (!m) return
        setMatch(m)
        if (m.score) setScore(m.score)
      } catch { /* silent */ }
    }

    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [id])

  /* ── Supabase Realtime ── */
  useEffect(() => {
    const matchCh = supabase
      .channel(`lmv-match-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Match', filter: `id=eq.${id}` },
        ({ new: n }) => {
          // Merge updated fields but preserve homeTeam/awayTeam objects from previous state
          setMatch(prev => ({ ...prev, ...n, homeTeam: prev?.homeTeam, awayTeam: prev?.awayTeam }))
          if (n.score) setScore(n.score)
        }
      ).subscribe()

    const commentCh = supabase
      .channel(`lmv-comments-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Comment', filter: `matchId=eq.${id}` },
        ({ new: n }) => setComments(prev => prev.some(c => c.id === n.id) ? prev : [...prev, n])
      ).subscribe()

    return () => {
      supabase.removeChannel(matchCh)
      supabase.removeChannel(commentCh)
    }
  }, [id])

  /* ── send (optimistic) ── */
  const handleSend = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)

    const opt = { id: `opt-${Date.now()}`, matchId: id, authorName: viewerName, text: t, createdAt: new Date().toISOString() }
    setComments(prev => [...prev, opt])
    setText('')

    try {
      const res  = await api.post('/comments', { matchId: id, authorName: viewerName, text: t })
      const saved = res.data?.data ?? res.data
      if (saved?.id) setComments(prev => prev.map(c => c.id === opt.id ? saved : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== opt.id))
    } finally {
      setSending(false)
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/watch/${id}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  /* ── loading / error states ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060c1a' }}>
      <Zap size={40} className="text-[#00D4FF] animate-pulse" />
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060c1a' }}>
      <div className="text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-bold">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-sm font-semibold">
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#060c1a' }}>
        {/* Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-1/4 left-0 w-96 h-96 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle,rgba(57,255,20,0.06) 0%,transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
          {/* Topbar */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(`/watch/${id}`)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-slate-500">Watching as</span>
                <span className="text-[#00D4FF]">{viewerName}</span>
              </div>
              <button onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: copied ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)',
                  border:     copied ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color:      copied ? '#39FF14' : 'white',
                }}>
                <AnimatePresence mode="wait">
                  {copied
                    ? <motion.span key="c" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} className="flex items-center gap-1"><Check size={12}/>Copied!</motion.span>
                    : <motion.span key="s" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} className="flex items-center gap-1"><Share2 size={12}/>Share</motion.span>
                  }
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Grid: scoreboard + commentary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <Scoreboard match={match} score={score} players={players} />
            </div>
            <div className="lg:col-span-5 lg:sticky lg:top-6">
              <CommentaryFeed
                comments={comments}
                viewerName={viewerName}
                onSend={handleSend}
                sending={sending}
                inputValue={text}
                onInputChange={setText}
                maxHeight={600}
              />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
