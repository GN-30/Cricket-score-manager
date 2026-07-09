import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, CalendarDays, ArrowLeft, Loader2, Target, Users, PlayCircle, RefreshCw, Clock } from 'lucide-react'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

/**
 * Compute effective tournament status:
 * - COMPLETED/ABANDONED/LIVE stored → use as-is
 * - endDate passed + any matches played → COMPLETED
 * - endDate passed + no matches played → ABANDONED
 * - otherwise → stored status
 */
function getEffectiveStatus(tournament, matches = []) {
  if (!tournament) return 'UPCOMING'
  const s = tournament.status
  if (s === 'COMPLETED' || s === 'ABANDONED' || s === 'LIVE') return s
  if (tournament.endDate) {
    const end = new Date(tournament.endDate)
    if (end < new Date()) {
      const played = matches.filter(
        m => m.status === 'COMPLETED' || m.status === 'LIVE' || m.status === 'ABANDONED'
      ).length
      return played > 0 ? 'COMPLETED' : 'ABANDONED'
    }
  }
  return s
}

const STATUS_STYLES = {
  UPCOMING:  'bg-[var(--color-electric-blue)]/10 text-[var(--color-electric-blue)] border-[var(--color-electric-blue)]/20',
  ONGOING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  LIVE:      'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  ABANDONED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

export default function TournamentDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('standings')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMatches = useCallback(async () => {
    try {
      const mRes = await api.get(`/matches?tournamentId=${id}`)
      setMatches(mRes.data.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
    }
  }, [id])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          api.get(`/tournaments/${id}`),
          api.get(`/matches?tournamentId=${id}`)
        ])
        setTournament(tRes.data.data)
        setMatches(mRes.data.data)
        setLastUpdated(new Date())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Auto-poll matches every 30s so the points table updates when a match is completed
  useEffect(() => {
    const interval = setInterval(fetchMatches, 30_000)
    return () => clearInterval(interval)
  }, [fetchMatches])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await fetchMatches()
    setRefreshing(false)
  }

  // Calculate Points Table
  const standings = useMemo(() => {
    if (!tournament?.teams || !matches.length) return []

    // Map all team IDs from tournament.teams to stats object
    // Note: teams array is just IDs, we need names. We can get names from the matches data,
    // since matches populate homeTeam and awayTeam.
    const teamStats = {}

    // Initialize all teams that appear in matches
    matches.forEach(m => {
      if (m.homeTeam && !teamStats[m.homeTeam.id]) {
        teamStats[m.homeTeam.id] = { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 }
      }
      if (m.awayTeam && !teamStats[m.awayTeam.id]) {
        teamStats[m.awayTeam.id] = { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 }
      }
    })

    // Process COMPLETED matches
    matches.filter(m => m.status === 'COMPLETED').forEach(m => {
      const homeId = m.homeTeamId
      const awayId = m.awayTeamId
      
      teamStats[homeId].played += 1
      teamStats[awayId].played += 1

      if (m.score?.winnerId === homeId) {
        teamStats[homeId].won += 1
        teamStats[homeId].points += 2
        teamStats[awayId].lost += 1
      } else if (m.score?.winnerId === awayId) {
        teamStats[awayId].won += 1
        teamStats[awayId].points += 2
        teamStats[homeId].lost += 1
      } else {
        // Tie or No Result
        teamStats[homeId].tied += 1
        teamStats[awayId].tied += 1
        teamStats[homeId].points += 1
        teamStats[awayId].points += 1
      }

      // Calculate NRR logic
      // In a real scenario, this requires tracking balls exactly, and adjusting overs for "all out".
      // We will do a basic approximation: 
      const innings = m.score?.innings || []
      let homeRuns = 0, homeBalls = 0, awayRuns = 0, awayBalls = 0
      
      const homeInn = innings.find(i => i.teamId === homeId)
      const awayInn = innings.find(i => i.teamId === awayId)

      let matchOvers = 20;
      try {
        if (m.format && m.format.startsWith('{')) {
          matchOvers = JSON.parse(m.format).overs || 20;
        }
      } catch (e) {}

      if (homeInn) {
        homeRuns = homeInn.totalRuns
        // If all out, overs faced is max overs. Otherwise, actual balls.
        homeBalls = homeInn.isAllOut ? (matchOvers * 6) : homeInn.balls
      }
      if (awayInn) {
        awayRuns = awayInn.totalRuns
        awayBalls = awayInn.isAllOut ? (matchOvers * 6) : awayInn.balls
      }

      teamStats[homeId].runsScored += homeRuns
      teamStats[homeId].oversFaced += (homeBalls / 6)
      teamStats[homeId].runsConceded += awayRuns
      teamStats[homeId].oversBowled += (awayBalls / 6)

      teamStats[awayId].runsScored += awayRuns
      teamStats[awayId].oversFaced += (awayBalls / 6)
      teamStats[awayId].runsConceded += homeRuns
      teamStats[awayId].oversBowled += (homeBalls / 6)
    })

    // Calculate Final NRR and Sort
    return Object.values(teamStats).map(t => {
      const rsPerOver = t.oversFaced > 0 ? (t.runsScored / t.oversFaced) : 0
      const rcPerOver = t.oversBowled > 0 ? (t.runsConceded / t.oversBowled) : 0
      t.nrr = rsPerOver - rcPerOver
      return t
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return b.nrr - a.nrr
    })
  }, [matches, tournament])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#00d4ff]" />
      </div>
    )
  }

  if (!tournament) {
    return <div className="text-center text-white mt-20">Tournament not found.</div>
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>

        {/* Header */}
        <div className="glass-card p-8 rounded-3xl border border-white/10 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-br from-black/40 to-black/80">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Trophy className="w-64 h-64 text-white" />
          </div>
          
          <div className="relative z-10 text-center md:text-left">
            {(() => {
              const eff = getEffectiveStatus(tournament, matches)
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-4 ${STATUS_STYLES[eff] ?? STATUS_STYLES.UPCOMING}`}>
                  {eff}
                </span>
              )
            })()}
            <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-2 text-shadow-glow">
              {tournament.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400 font-medium mt-4">
              <span className="flex items-center gap-1.5"><CalendarDays size={16} className="text-[#00d4ff]" /> {new Date(tournament.startDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5"><Target size={16} className="text-[#00d4ff]" /> {tournament.format?.replace('_', ' ')}</span>
              {tournament.settings && (
                <span className="flex items-center gap-1.5"><Users size={16} className="text-[#00d4ff]" /> {tournament.settings.overs} Overs, {tournament.settings.playersPerTeam} Players</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-1">
          <button onClick={() => setActiveTab('standings')} className={`pb-3 px-4 font-black uppercase tracking-widest text-sm transition-all border-b-2 ${activeTab === 'standings' ? 'border-[#00d4ff] text-[#00d4ff]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            Standings
          </button>
          <button onClick={() => setActiveTab('fixtures')} className={`pb-3 px-4 font-black uppercase tracking-widest text-sm transition-all border-b-2 ${activeTab === 'fixtures' ? 'border-[#00d4ff] text-[#00d4ff]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            Fixtures ({matches.length})
          </button>

          {/* Refresh controls */}
          <div className="ml-auto flex items-center gap-3 pb-3">
            {lastUpdated && (
              <span className="text-[10px] text-slate-500 font-medium">
                Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#00d4ff] transition-colors"
              title="Refresh standings"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#00d4ff]' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Content */}
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
                    <tr key={team.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-black text-white">{idx + 1}</td>
                      <td className="p-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                          {team.shortName}
                        </div>
                        {team.name}
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
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">No teams or matches available for standings.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="grid md:grid-cols-2 gap-6">
            {matches.map(m => (
              <div key={m.id} className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40 hover:border-white/20 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4 text-xs font-bold uppercase tracking-widest">
                  <span className={`px-2 py-1 rounded-md ${
                    m.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                    m.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    m.status === 'ABANDONED' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {m.status}
                  </span>
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
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 text-white font-black text-sm">
                      {m.homeTeam?.shortName}
                    </div>
                    <span className="text-slate-300 font-bold text-sm block truncate">{m.homeTeam?.name}</span>
                  </div>
                  <div className="text-slate-600 font-black italic">VS</div>
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 text-white font-black text-sm">
                      {m.awayTeam?.shortName}
                    </div>
                    <span className="text-slate-300 font-bold text-sm block truncate">{m.awayTeam?.name}</span>
                  </div>
                </div>

                {user && m.status !== 'COMPLETED' ? (
                  <button onClick={() => navigate(`/match/${m.id}`)} className="w-full py-3 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 text-[#00d4ff] rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                    <PlayCircle size={16} /> {m.status === 'LIVE' ? 'Continue Scoring' : 'Start Match'}
                  </button>
                ) : m.status === 'COMPLETED' ? (
                  <div className="text-center text-sm font-bold text-slate-400 bg-white/5 py-3 rounded-xl uppercase tracking-widest">
                    {m.score?.winnerId && m.score.winnerId !== 'TIE' ? `${m.score.winnerId === m.homeTeamId ? m.homeTeam?.shortName : m.awayTeam?.shortName} Won` : (m.score?.winnerId === 'TIE' ? 'Match Tied' : 'No Result')}
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
      </div>
    </PageTransition>
  )
}
