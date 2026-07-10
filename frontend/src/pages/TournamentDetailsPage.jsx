import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, CalendarDays, ArrowLeft, Loader2, Target, Users,
  PlayCircle, RefreshCw, Clock, Crown, Swords, Zap, CheckCircle2,
  AlertCircle, ChevronRight,
} from 'lucide-react'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

/* ─── Status helpers ─────────────────────────────────────────────── */
/**
 * A tournament is ONLY "COMPLETED" when every single match is COMPLETED or ABANDONED.
 * If any match is still SCHEDULED/LIVE → ONGOING.
 */
function getEffectiveStatus(tournament, matches = []) {
  if (!tournament) return 'UPCOMING'
  if (tournament.status === 'ABANDONED') return 'ABANDONED'

  if (matches.length > 0) {
    if (matches.some(m => m.status === 'LIVE')) return 'LIVE'
    if (matches.every(m => m.status === 'COMPLETED' || m.status === 'ABANDONED')) return 'COMPLETED'
    if (matches.some(m => m.status === 'COMPLETED' || m.status === 'LIVE' || m.status === 'ABANDONED')) return 'ONGOING'
    return tournament.status || 'UPCOMING'
  }

  if (tournament.status === 'COMPLETED' || tournament.status === 'LIVE') return tournament.status
  return tournament.status || 'UPCOMING'
}

const STATUS_STYLES = {
  UPCOMING:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ONGOING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  LIVE:      'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  ABANDONED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const PLAYOFF_TYPES = ['SEMIFINAL_1', 'SEMIFINAL_2', 'SEMIFINAL', 'FINAL', 'PLAYOFF']

/* ─── Playoff bracket logic ─────────────────────────────────────── */
/**
 * Returns the full bracket structure from standings + existing playoff matches.
 *
 * Bracket:
 *   SF1  →  1st vs 4th (or 1st vs 2nd if < 4 teams)
 *   SF2  →  2nd vs 3rd (skipped if < 4 teams)
 *   FINAL → SF1 winner vs SF2 winner (or 1st vs 2nd directly)
 */
function computeBracket(standings, playoffMatches) {
  const sf1Match  = playoffMatches.find(m => m.matchType === 'SEMIFINAL_1' || m.matchType === 'SEMIFINAL')
  const sf2Match  = playoffMatches.find(m => m.matchType === 'SEMIFINAL_2')
  const finalMatch = playoffMatches.find(m => m.matchType === 'FINAL')

  const enough = standings.length >= 4

  // ── SF1: 1st vs 4th ──
  const sf1 = {
    match: sf1Match,
    home: sf1Match ? sf1Match.homeTeam : (standings[0] ?? null),
    away: sf1Match ? sf1Match.awayTeam : (enough ? standings[3] : standings[1] ?? null),
    homeLabel: '1st Place',
    awayLabel: enough ? '4th Place' : '2nd Place',
    isConfirmed: !!sf1Match,
  }

  // ── SF2: 2nd vs 3rd (only if ≥4 teams) ──
  const sf2 = enough ? {
    match: sf2Match,
    home: sf2Match ? sf2Match.homeTeam : standings[1] ?? null,
    away: sf2Match ? sf2Match.awayTeam : standings[2] ?? null,
    homeLabel: '2nd Place',
    awayLabel: '3rd Place',
    isConfirmed: !!sf2Match,
  } : null

  // ── Winners ──
  const getWinner = (m) => {
    if (!m || m.status !== 'COMPLETED' || !m.score?.winnerId || m.score.winnerId === 'TIE') return null
    return m.score.winnerId === m.homeTeamId ? m.homeTeam : m.awayTeam
  }
  const sf1Winner = getWinner(sf1Match)
  const sf2Winner = getWinner(sf2Match)

  // ── Final ──
  const final = {
    match: finalMatch,
    home: finalMatch ? finalMatch.homeTeam : (sf1Winner ?? null),
    away: finalMatch ? finalMatch.awayTeam : (sf2Winner ?? null),
    homeLabel: enough ? 'SF1 Winner' : '1st Place',
    awayLabel: enough ? 'SF2 Winner' : '2nd Place',
    isConfirmed: !!finalMatch,
  }

  // ── Champion ──
  const champion = getWinner(finalMatch)

  // ── Derive "can generate" flags ──
  const sf1Done = sf1Match && (sf1Match.status === 'COMPLETED' || sf1Match.status === 'ABANDONED')
  const sf2Done = !enough || (sf2Match && (sf2Match.status === 'COMPLETED' || sf2Match.status === 'ABANDONED'))
  const bothSFDone = sf1Done && sf2Done

  return { sf1, sf2, final, sf1Winner, sf2Winner, champion, bothSFDone, enough }
}

/* ─── Bracket Team Slot ─────────────────────────────────────────── */
function BracketTeam({ team, label, isWinner, isPlaceholder, positionLabel }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      isWinner
        ? 'border-yellow-500/50 bg-yellow-500/10'
        : isPlaceholder
          ? 'border-white/10 bg-white/3 border-dashed'
          : 'border-white/15 bg-white/5'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
        isWinner ? 'bg-yellow-500/30 text-yellow-300' :
        isPlaceholder ? 'bg-white/5 text-slate-600' :
        'bg-slate-800 text-slate-300'
      }`}>
        {isPlaceholder ? (positionLabel?.[0] ?? '?') : (team?.shortName ?? '?')}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-bold truncate ${isWinner ? 'text-yellow-300' : isPlaceholder ? 'text-slate-600' : 'text-white'}`}>
          {isPlaceholder ? positionLabel : team?.name ?? 'TBD'}
        </p>
        <p className={`text-[10px] font-medium ${isWinner ? 'text-yellow-500/70' : 'text-slate-500'}`}>
          {isWinner ? '★ Winner' : label}
        </p>
      </div>
    </div>
  )
}

/* ─── Single Bracket Match Card ─────────────────────────────────── */
function BracketMatchCard({ slot, label, highlight, onNavigate, user, isPlaceholder }) {
  const { match: m, home, away, homeLabel, awayLabel, isConfirmed } = slot

  const getWinner = () => {
    if (!m || m.status !== 'COMPLETED' || !m.score?.winnerId) return null
    if (m.score.winnerId === 'TIE') return 'TIE'
    return m.score.winnerId === m.homeTeamId ? m.homeTeam : m.awayTeam
  }
  const winner = getWinner()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 transition-all ${
        highlight
          ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/8 to-black/60'
          : isPlaceholder && !isConfirmed
            ? 'border-dashed border-white/10 bg-black/20'
            : 'border-white/10 bg-black/40'
      }`}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
          highlight ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#00d4ff]/10 text-[#00d4ff]'
        }`}>
          {label}
        </span>
        {m && (
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
            m.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
            m.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
            m.status === 'ABANDONED' ? 'bg-orange-500/20 text-orange-400' :
            'bg-slate-800 text-slate-400'
          }`}>
            {m.status}
          </span>
        )}
        {!m && !isPlaceholder && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-800/50 text-slate-500">
            Scheduled
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2 mb-4">
        <BracketTeam
          team={home}
          label={homeLabel}
          isWinner={winner && winner !== 'TIE' && winner?.id === home?.id}
          isPlaceholder={!isConfirmed && !home}
          positionLabel={homeLabel}
        />
        <div className="text-center text-slate-700 font-black text-xs tracking-widest">VS</div>
        <BracketTeam
          team={away}
          label={awayLabel}
          isWinner={winner && winner !== 'TIE' && winner?.id === away?.id}
          isPlaceholder={!isConfirmed && !away}
          positionLabel={awayLabel}
        />
      </div>

      {/* Date */}
      {m?.date && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium mb-3">
          <Clock size={9} />
          {new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          {' · '}
          {new Date(m.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      )}

      {/* Action */}
      {m?.status === 'COMPLETED' ? (
        <div className="text-center text-xs font-bold text-slate-400 bg-white/5 py-2 rounded-xl uppercase tracking-widest">
          {winner === 'TIE' ? 'Match Tied' : winner ? `${winner.shortName} Won` : 'No Result'}
        </div>
      ) : m && user ? (
        <button
          onClick={() => onNavigate(`/match/${m.id}`)}
          className="w-full py-2.5 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff] rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
        >
          <PlayCircle size={14} /> {m.status === 'LIVE' ? 'Continue Scoring' : 'Start Match'}
        </button>
      ) : !m ? (
        <div className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-2 border-t border-white/5">
          {isPlaceholder ? 'Awaiting group stage results' : 'Not yet scheduled'}
        </div>
      ) : (
        <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2 border-t border-white/5">
          Login to score
        </div>
      )}
    </motion.div>
  )
}

/* ─── Auto-Generate Button ──────────────────────────────────────── */
function AutoGenButton({ label, description, onClick, loading, icon: Icon = Zap }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-[#00d4ff]/30 bg-[#00d4ff]/5 p-5 flex flex-col sm:flex-row items-center gap-4"
    >
      <div className="flex-1 text-center sm:text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#00d4ff] mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
          <Icon size={10} /> Auto Schedule
        </p>
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-slate-400 text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #00d4ff22, #00d4ff11)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: '#00d4ff',
          boxShadow: '0 0 16px rgba(0,212,255,0.15)',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        Generate
      </button>
    </motion.div>
  )
}

/* ─── Full Playoffs Section ─────────────────────────────────────── */
function PlayoffsSection({ matches, standings, tournament, onMatchCreated, onNavigate, user }) {
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState(null) // { text, type }

  const groupMatches  = matches.filter(m => !m.matchType || !PLAYOFF_TYPES.includes(m.matchType))
  const playoffMatches = matches.filter(m => m.matchType && PLAYOFF_TYPES.includes(m.matchType))

  const allGroupDone = groupMatches.length > 0 &&
    groupMatches.every(m => m.status === 'COMPLETED' || m.status === 'ABANDONED')

  const bracket = computeBracket(standings, playoffMatches)
  const { sf1, sf2, final, sf1Winner, sf2Winner, champion, bothSFDone, enough } = bracket

  // Can auto-generate semis?
  const canGenSemis = user && allGroupDone && !sf1.match && standings.length >= 2

  // Can auto-generate final?
  const canGenFinal = user && sf1Winner && (!enough || sf2Winner) && !final.match

  const showMsg = (text, type = 'success') => {
    setGenMsg({ text, type })
    setTimeout(() => setGenMsg(null), 4000)
  }

  const getVenue = () => tournament?.settings?.venue || 'Tournament Venue'
  const getFutureDate = (daysAhead) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    d.setHours(14, 0, 0, 0)
    return d.toISOString()
  }
  const getFormat = () => tournament?.settings
    ? JSON.stringify({ overs: tournament.settings.overs, playersPerTeam: tournament.settings.playersPerTeam })
    : '{"overs":20,"playersPerTeam":11}'

  const handleGenSemis = async () => {
    if (!standings[0] || !standings[1]) return
    setGenerating(true)
    try {
      // SF1: 1st vs 4th
      await api.post('/matches', {
        homeTeamId: standings[0].id,
        awayTeamId: (enough ? standings[3] : standings[1]).id,
        venue: getVenue(),
        date: getFutureDate(1),
        format: getFormat(),
        tournamentId: tournament.id,
        matchType: 'SEMIFINAL_1',
        status: 'SCHEDULED',
      })

      // SF2: 2nd vs 3rd (only if ≥4 teams)
      if (enough && standings[2]) {
        await api.post('/matches', {
          homeTeamId: standings[1].id,
          awayTeamId: standings[2].id,
          venue: getVenue(),
          date: getFutureDate(1),
          format: getFormat(),
          tournamentId: tournament.id,
          matchType: 'SEMIFINAL_2',
          status: 'SCHEDULED',
        })
      }

      showMsg(enough ? 'Semi Finals scheduled! SF1: 1st vs 4th · SF2: 2nd vs 3rd' : 'Final scheduled directly (only 2–3 teams)!')
      onMatchCreated?.()
    } catch (err) {
      showMsg(err.message || 'Failed to generate playoffs', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenFinal = async () => {
    if (!sf1Winner) return
    const team2 = enough ? sf2Winner : standings[1]
    if (!team2) return
    setGenerating(true)
    try {
      await api.post('/matches', {
        homeTeamId: sf1Winner.id,
        awayTeamId: team2.id,
        venue: getVenue(),
        date: getFutureDate(2),
        format: getFormat(),
        tournamentId: tournament.id,
        matchType: 'FINAL',
        status: 'SCHEDULED',
      })
      showMsg(`Final scheduled: ${sf1Winner.shortName} vs ${team2.shortName}!`)
      onMatchCreated?.()
    } catch (err) {
      showMsg(err.message || 'Failed to generate final', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Champion Banner ── */}
      <AnimatePresence>
        {champion && (
          <motion.div
            key="champion"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-8 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-yellow-400/5 to-transparent" />
            <Crown className="w-14 h-14 text-yellow-400 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mb-2">Tournament Champion 🏆</p>
            <h2 className="text-4xl font-black text-white uppercase tracking-wide mb-1">{champion.name}</h2>
            <p className="text-yellow-400 font-bold">{champion.shortName}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status / Info strip ── */}
      {!allGroupDone && groupMatches.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/30 text-sm text-slate-400 font-medium">
          <AlertCircle size={16} className="text-yellow-400 shrink-0" />
          <span>
            Group stage in progress —{' '}
            <span className="text-white font-bold">{groupMatches.filter(m => m.status === 'COMPLETED').length}/{groupMatches.length}</span>
            {' '}matches completed. Playoff teams will be confirmed when group stage is finished.
          </span>
        </div>
      )}
      {allGroupDone && !playoffMatches.length && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-sm text-green-400 font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          Group stage complete! Playoff teams are confirmed below.
          {user && <span className="ml-1 text-[#00d4ff] font-bold">Use the button below to auto-schedule playoff matches.</span>}
        </div>
      )}

      {/* ── Notification ── */}
      <AnimatePresence>
        {genMsg && (
          <motion.div
            key="gen-msg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              genMsg.type === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}
          >
            {genMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            {genMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Auto-Generate Buttons ── */}
      {canGenSemis && (
        <AutoGenButton
          label={enough ? 'Schedule Semi Finals' : 'Schedule Final (Direct)'}
          description={
            enough
              ? `SF1: ${standings[0]?.shortName} (1st) vs ${standings[3]?.shortName} (4th) · SF2: ${standings[1]?.shortName} (2nd) vs ${standings[2]?.shortName} (3rd)`
              : `${standings[0]?.shortName} (1st) vs ${standings[1]?.shortName} (2nd)`
          }
          onClick={handleGenSemis}
          loading={generating}
        />
      )}
      {canGenFinal && enough && (
        <AutoGenButton
          label="Schedule the Final"
          description={`${sf1Winner?.shortName} vs ${sf2Winner?.shortName ?? '(SF2 pending)'}`}
          onClick={handleGenFinal}
          loading={generating}
          icon={Trophy}
        />
      )}

      {/* ── Bracket ── */}
      <div className="space-y-8">

        {/* ── Semi Finals ── */}
        {enough && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Swords size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Semi Finals</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* SF1 */}
              <BracketMatchCard
                slot={sf1}
                label="Semi Final 1"
                onNavigate={onNavigate}
                user={user}
                isPlaceholder={!sf1.isConfirmed}
              />
              {/* SF2 */}
              <BracketMatchCard
                slot={sf2}
                label="Semi Final 2"
                onNavigate={onNavigate}
                user={user}
                isPlaceholder={!sf2?.isConfirmed}
              />
            </div>

            {/* Arrow to final */}
            <div className="flex justify-center items-center gap-3 py-4">
              <div className="flex-1 h-px bg-white/5" />
              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-widest">
                <ChevronRight size={14} /> Winners advance <ChevronRight size={14} />
              </div>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          </div>
        )}

        {/* ── Final ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-black uppercase tracking-widest text-yellow-500/80">
              {enough ? 'Grand Final' : 'Final'}
            </span>
            <div className="flex-1 h-px bg-yellow-500/20" />
          </div>

          {/* Build the final slot object from bracket */}
          {(() => {
            // If no SF (< 4 teams), the final slot uses standings directly
            const finalSlot = {
              match: final.match,
              home: final.home,
              away: final.away,
              homeLabel: final.homeLabel,
              awayLabel: final.awayLabel,
              isConfirmed: !!final.match || (sf1Winner != null && (!enough || sf2Winner != null)),
            }
            return (
              <div className="max-w-md mx-auto">
                <BracketMatchCard
                  slot={finalSlot}
                  label="Final"
                  highlight
                  onNavigate={onNavigate}
                  user={user}
                  isPlaceholder={!finalSlot.isConfirmed}
                />
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5 text-[10px] font-medium text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-dashed border-white/20 inline-block" />
          Placeholder (awaiting results)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-white/20 bg-white/5 inline-block" />
          Confirmed team
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-yellow-500/40 bg-yellow-500/10 inline-block" />
          Winner
        </span>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function TournamentDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [matches, setMatches]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('standings')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing]   = useState(false)

  const fetchMatches = useCallback(async () => {
    try {
      const mRes = await api.get(`/matches?tournamentId=${id}`)
      setMatches(mRes.data.data)
      setLastUpdated(new Date())
    } catch (err) { console.error(err) }
  }, [id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          api.get(`/tournaments/${id}`),
          api.get(`/matches?tournamentId=${id}`),
        ])
        setTournament(tRes.data.data)
        setMatches(mRes.data.data)
        setLastUpdated(new Date())
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [id])

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchMatches, 30_000)
    return () => clearInterval(interval)
  }, [fetchMatches])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await fetchMatches()
    setRefreshing(false)
  }

  /* ── Derived data ── */
  const groupMatches  = useMemo(() => matches.filter(m => !m.matchType || !PLAYOFF_TYPES.includes(m.matchType)), [matches])
  const playoffMatches = useMemo(() => matches.filter(m => m.matchType && PLAYOFF_TYPES.includes(m.matchType)), [matches])

  /* ── Standings (from group matches only) ── */
  const standings = useMemo(() => {
    if (!tournament?.teams || !groupMatches.length) return []
    const teamStats = {}

    groupMatches.forEach(m => {
      if (m.homeTeam && !teamStats[m.homeTeam.id])
        teamStats[m.homeTeam.id] = { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 }
      if (m.awayTeam && !teamStats[m.awayTeam.id])
        teamStats[m.awayTeam.id] = { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 }
    })

    groupMatches.filter(m => m.status === 'COMPLETED').forEach(m => {
      const h = m.homeTeamId, a = m.awayTeamId
      if (!teamStats[h] || !teamStats[a]) return
      teamStats[h].played += 1; teamStats[a].played += 1
      if (m.score?.winnerId === h) { teamStats[h].won += 1; teamStats[h].points += 2; teamStats[a].lost += 1 }
      else if (m.score?.winnerId === a) { teamStats[a].won += 1; teamStats[a].points += 2; teamStats[h].lost += 1 }
      else { teamStats[h].tied += 1; teamStats[a].tied += 1; teamStats[h].points += 1; teamStats[a].points += 1 }

      const innings = m.score?.innings || []
      let matchOvers = 20
      try { if (m.format?.startsWith('{')) matchOvers = JSON.parse(m.format).overs || 20 } catch (_) {}
      const hi = innings.find(i => i.teamId === h)
      const ai = innings.find(i => i.teamId === a)
      if (hi) { teamStats[h].runsScored += hi.totalRuns; teamStats[h].oversFaced += hi.isAllOut ? matchOvers : (hi.balls / 6); teamStats[h].runsConceded += ai?.totalRuns ?? 0; teamStats[h].oversBowled += ai ? (ai.isAllOut ? matchOvers : ai.balls / 6) : 0 }
      if (ai) { teamStats[a].runsScored += ai.totalRuns; teamStats[a].oversFaced += ai.isAllOut ? matchOvers : (ai.balls / 6); teamStats[a].runsConceded += hi?.totalRuns ?? 0; teamStats[a].oversBowled += hi ? (hi.isAllOut ? matchOvers : hi.balls / 6) : 0 }
    })

    return Object.values(teamStats).map(t => {
      t.nrr = (t.oversFaced > 0 ? t.runsScored / t.oversFaced : 0) - (t.oversBowled > 0 ? t.runsConceded / t.oversBowled : 0)
      return t
    }).sort((a, b) => b.points !== a.points ? b.points - a.points : b.nrr - a.nrr)
  }, [groupMatches, tournament])

  const effectiveStatus = useMemo(() => getEffectiveStatus(tournament, matches), [tournament, matches])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-[#00d4ff]" />
    </div>
  )
  if (!tournament) return <div className="text-center text-white mt-20">Tournament not found.</div>

  const completedCount = matches.filter(m => m.status === 'COMPLETED').length
  const liveCount      = matches.filter(m => m.status === 'LIVE').length
  const scheduledCount = matches.filter(m => m.status === 'SCHEDULED').length

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>

        {/* ── Header ── */}
        <div className="glass-card p-8 rounded-3xl border border-white/10 mb-8 relative overflow-hidden bg-gradient-to-br from-black/40 to-black/80">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Trophy className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-4 ${STATUS_STYLES[effectiveStatus] ?? STATUS_STYLES.UPCOMING}`}>
              {effectiveStatus}
            </span>
            <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-2">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-medium mt-4">
              <span className="flex items-center gap-1.5"><CalendarDays size={16} className="text-[#00d4ff]" /> {new Date(tournament.startDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5"><Target size={16} className="text-[#00d4ff]" /> {tournament.format?.replace('_', ' ')}</span>
              {tournament.settings && <span className="flex items-center gap-1.5"><Users size={16} className="text-[#00d4ff]" /> {tournament.settings.overs} Overs · {tournament.settings.playersPerTeam} Players</span>}
            </div>
            {matches.length > 0 && (
              <div className="mt-4 flex items-center gap-3 text-xs font-medium">
                <span className="text-green-400 font-bold">{completedCount} Completed</span>
                <span className="text-slate-600">·</span>
                <span className="text-red-400 font-bold">{liveCount} Live</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{scheduledCount} Scheduled</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">{matches.length} Total</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-1 overflow-x-auto">
          {[
            { key: 'standings', label: 'Standings' },
            { key: 'fixtures',  label: `Fixtures (${groupMatches.length})` },
            { key: 'playoffs',  label: '🏆 Playoffs', gold: true },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-4 font-black uppercase tracking-widest text-sm transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? tab.gold ? 'border-yellow-400 text-yellow-400' : 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 pb-3">
            {lastUpdated && (
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button onClick={handleManualRefresh} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#00d4ff] transition-colors">
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#00d4ff]' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Standings Tab ── */}
        {activeTab === 'standings' && (
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden bg-black/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <th className="p-4 pl-6">Pos</th>
                    <th className="p-4">Team</th>
                    <th className="p-4 text-center">P</th>
                    <th className="p-4 text-center">W</th>
                    <th className="p-4 text-center">L</th>
                    <th className="p-4 text-center">T</th>
                    <th className="p-4 text-center">Pts</th>
                    <th className="p-4 text-right pr-6">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-medium text-slate-300">
                  {standings.map((team, idx) => (
                    <tr key={team.id} className={`hover:bg-white/5 transition-colors ${idx === 0 ? 'bg-yellow-500/5' : idx < 4 ? 'bg-[#00d4ff]/3' : ''}`}>
                      <td className="p-4 pl-6 font-black text-white">
                        {idx === 0 ? <Crown size={13} className="text-yellow-400 inline mr-1" /> : null}
                        {idx + 1}
                        {idx < 4 && standings.length >= 4 && (
                          <span className="ml-1.5 text-[8px] font-black text-[#00d4ff]/60 uppercase">Q</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-white">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-800 text-slate-400'}`}>
                            {team.shortName}
                          </div>
                          {team.name}
                        </div>
                      </td>
                      <td className="p-4 text-center">{team.played}</td>
                      <td className="p-4 text-center text-green-400">{team.won}</td>
                      <td className="p-4 text-center text-red-400">{team.lost}</td>
                      <td className="p-4 text-center">{team.tied}</td>
                      <td className="p-4 text-center font-black text-[#00d4ff] text-base">{team.points}</td>
                      <td className="p-4 text-right pr-6 font-mono">{team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3)}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">No matches played yet. Standings will appear once matches are completed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {standings.length >= 4 && (
              <div className="px-6 py-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <span className="text-[#00d4ff]/60 font-bold">Q</span> = Qualifies for playoffs (top 4)
              </div>
            )}
          </div>
        )}

        {/* ── Fixtures Tab ── */}
        {activeTab === 'fixtures' && (
          <div className="grid md:grid-cols-2 gap-6">
            {groupMatches.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-500 glass-card rounded-3xl border border-white/10 p-8">
                No group stage fixtures found.
              </div>
            )}
            {groupMatches.map(m => (
              <div key={m.id} className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40 hover:border-white/20 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4 text-xs font-bold uppercase tracking-widest">
                  <span className={`px-2 py-1 rounded-md ${
                    m.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                    m.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    m.status === 'ABANDONED' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{m.status}</span>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs font-bold">
                      {m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                    <div className="text-[#00d4ff] text-[10px] font-black flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={9} />
                      {m.date ? new Date(m.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 text-white font-black text-sm">{m.homeTeam?.shortName}</div>
                    <span className="text-slate-300 font-bold text-sm block truncate">{m.homeTeam?.name}</span>
                  </div>
                  <div className="text-slate-600 font-black italic">VS</div>
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 text-white font-black text-sm">{m.awayTeam?.shortName}</div>
                    <span className="text-slate-300 font-bold text-sm block truncate">{m.awayTeam?.name}</span>
                  </div>
                </div>
                {user && m.status !== 'COMPLETED' ? (
                  <button onClick={() => navigate(`/match/${m.id}`)} className="w-full py-3 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff] rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                    <PlayCircle size={16} /> {m.status === 'LIVE' ? 'Continue Scoring' : 'Start Match'}
                  </button>
                ) : m.status === 'COMPLETED' ? (
                  <div className="text-center text-sm font-bold text-slate-400 bg-white/5 py-3 rounded-xl uppercase tracking-widest">
                    {m.score?.winnerId && m.score.winnerId !== 'TIE'
                      ? `${m.score.winnerId === m.homeTeamId ? m.homeTeam?.shortName : m.awayTeam?.shortName} Won`
                      : m.score?.winnerId === 'TIE' ? 'Match Tied' : 'No Result'}
                  </div>
                ) : (
                  <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest pt-3 border-t border-white/5">
                    Login to score
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Playoffs Tab ── */}
        {activeTab === 'playoffs' && (
          <PlayoffsSection
            matches={matches}
            standings={standings}
            tournament={tournament}
            onMatchCreated={fetchMatches}
            onNavigate={navigate}
            user={user}
          />
        )}
      </div>
    </PageTransition>
  )
}
