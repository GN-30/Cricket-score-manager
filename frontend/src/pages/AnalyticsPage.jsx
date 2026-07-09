import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Activity, TrendingUp, Target, Shield, Zap, Award } from 'lucide-react'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

const COLORS = ['#00d4ff', '#39ff8e', '#f87171', '#ffd700', '#c084fc', '#fb923c', '#ff5252', '#00f2fe']

export default function AnalyticsPage() {
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mRes, pRes, tRes] = await Promise.all([
          api.get('/matches'),
          api.get('/players'),
          api.get('/teams')
        ])
        setMatches(mRes.data.data)
        setPlayers(pRes.data.data)
        setTeams(tRes.data.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Derived Analytics
  const { topBatsmen, topBowlers, teamWins, matchRuns, summaryStats } = useMemo(() => {
    const totalMatches = matches.length
    const completedMatches = matches.filter(m => m.status === 'COMPLETED').length
    const liveMatches = matches.filter(m => m.status === 'LIVE').length
    const scheduledMatches = matches.filter(m => m.status === 'SCHEDULED').length

    if (!matches.length || !players.length) return {
      topBatsmen: [], topBowlers: [], teamWins: [], matchRuns: [],
      summaryStats: { totalMatches, completedMatches, liveMatches, scheduledMatches }
    }

    const playerMap = players.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {})
    const teamMap = teams.reduce((acc, t) => ({ ...acc, [t.id]: t.shortName }), {})

    let batsmenStats = {}
    let bowlerStats = {}
    let wins = {}
    let runsProgression = []

    // Initialize team wins
    teams.forEach(t => wins[t.id] = 0)

    matches.forEach((m, idx) => {
      // Determine Win/Loss via winnerId first, then score comparison
      if (m.status === 'COMPLETED') {
        if (m.winnerId) {
          wins[m.winnerId] = (wins[m.winnerId] || 0) + 1
        }
      }

      // Aggregate Score data
      if (m.score && m.score.innings) {
        let matchTotal = 0
        m.score.innings.forEach(inn => {
          matchTotal += inn.totalRuns || 0

          if (inn.batsmen) {
            Object.entries(inn.batsmen).forEach(([pid, stats]) => {
              if (!batsmenStats[pid]) batsmenStats[pid] = { name: playerMap[pid] || 'Unknown', runs: 0, fours: 0, sixes: 0 }
              batsmenStats[pid].runs += stats.runs || 0
              batsmenStats[pid].fours += stats.fours || 0
              batsmenStats[pid].sixes += stats.sixes || 0
            })
          }
          if (inn.bowlers) {
            Object.entries(inn.bowlers).forEach(([pid, stats]) => {
              if (!bowlerStats[pid]) bowlerStats[pid] = { name: playerMap[pid] || 'Unknown', wickets: 0, runsConceded: 0 }
              bowlerStats[pid].wickets += stats.wickets || 0
              bowlerStats[pid].runsConceded += stats.runs || 0
            })
          }
        })
        runsProgression.push({ match: `M${idx + 1}`, runs: matchTotal })
      }
    })

    const topBatsmen = Object.values(batsmenStats).sort((a, b) => b.runs - a.runs).slice(0, 5)
    const topBowlers = Object.values(bowlerStats).sort((a, b) => b.wickets - a.wickets).slice(0, 5)

    const teamWinsList = Object.entries(wins).map(([id, w]) => ({
      name: teamMap[id] || 'TBD', value: w
    })).filter(t => t.value > 0)

    return {
      topBatsmen, topBowlers, teamWins: teamWinsList, matchRuns: runsProgression,
      summaryStats: { totalMatches, completedMatches, liveMatches, scheduledMatches }
    }
  }, [matches, players, teams])

  if (loading) return <div className="h-screen flex items-center justify-center text-white"><Zap className="animate-pulse w-12 h-12 text-[#00d4ff]" /></div>

  const ss = summaryStats ?? { totalMatches: 0, completedMatches: 0, liveMatches: 0, scheduledMatches: 0 }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white mb-2">Tournament <span className="text-[#00d4ff]">Analytics</span></h1>
          <p className="text-slate-400 font-light">Deep dive into player statistics, team performance, and match insights.</p>
        </div>

        {/* Summary Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Matches', value: ss.totalMatches, color: '#00d4ff', icon: '🏏' },
            { label: 'Completed',     value: ss.completedMatches, color: '#39ff8e', icon: '✅' },
            { label: 'Live Now',      value: ss.liveMatches, color: '#ff6b6b', icon: '🔴' },
            { label: 'Upcoming',      value: ss.scheduledMatches, color: '#ffd700', icon: '📅' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="glass-card p-5 rounded-2xl border border-white/10 bg-black/40 flex items-center gap-4">
              <span style={{ fontSize: 28 }}>{icon}</span>
              <div>
                <div style={{ color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ color: 'rgba(148,163,184,0.8)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Batsmen Chart */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
              <TrendingUp className="text-[#00d4ff]" size={18}/> Highest Run Scorers
            </h3>
            <div className="h-72">
              {topBatsmen.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBatsmen} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#888" />
                    <YAxis dataKey="name" type="category" stroke="#888" width={80} tick={{fill: '#ccc', fontSize: 12}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
                    <Bar dataKey="runs" fill="#00d4ff" radius={[0, 4, 4, 0]}>
                      {topBatsmen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No batting data available</div>}
            </div>
          </div>

          {/* Top Bowlers Chart */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
              <Target className="text-red-400" size={18}/> Top Wicket Takers
            </h3>
            <div className="h-72">
              {topBowlers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBowlers} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#888" />
                    <YAxis dataKey="name" type="category" stroke="#888" width={80} tick={{fill: '#ccc', fontSize: 12}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
                    <Bar dataKey="wickets" fill="#f87171" radius={[0, 4, 4, 0]}>
                      {topBowlers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[COLORS.length - 1 - index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No bowling data available</div>}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Team Wins Pie */}
          <div className="lg:col-span-4 glass-card p-6 rounded-3xl border border-white/10 bg-black/40">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
              <Award className="text-[#ffd700]" size={18}/> Win Distribution
            </h3>
            <div className="h-64">
              {teamWins.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={teamWins} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {teamWins.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No completed matches</div>}
            </div>
          </div>

          {/* Tournament Run Progression */}
          <div className="lg:col-span-8 glass-card p-6 rounded-3xl border border-white/10 bg-black/40">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
              <Activity className="text-[#39ff8e]" size={18}/> Tournament Runs Progression
            </h3>
            <div className="h-64">
              {matchRuns.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={matchRuns} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="match" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
                    <Line type="monotone" dataKey="runs" stroke="#39ff8e" strokeWidth={3} dot={{ fill: '#39ff8e', strokeWidth: 2, r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No score data recorded yet</div>}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
