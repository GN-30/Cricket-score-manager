import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, MapPin, CalendarDays, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

/**
 * Compute effective tournament status:
 * - If stored status is already COMPLETED/ABANDONED/LIVE → use as-is
 * - If endDate has passed AND any matches were played → COMPLETED
 * - If endDate has passed AND no matches were played → ABANDONED
 * - Otherwise → use stored status (UPCOMING / ONGOING)
 */
function getEffectiveStatus(t, matchCounts = {}) {
  if (t.status === 'COMPLETED' || t.status === 'ABANDONED' || t.status === 'LIVE') return t.status
  if (t.endDate) {
    const end = new Date(t.endDate)
    if (end < new Date()) {
      const played = matchCounts[t.id] ?? 0
      return played > 0 ? 'COMPLETED' : 'ABANDONED'
    }
  }
  return t.status
}

const STATUS_STYLES = {
  UPCOMING:  'bg-[var(--color-electric-blue)]/10 text-[var(--color-electric-blue)] border-[var(--color-electric-blue)]/20',
  ONGOING:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  LIVE:      'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  ABANDONED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([])
  const [matchCounts, setMatchCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const tRes = await api.get('/tournaments')
        const tList = tRes.data?.data ?? []
        setTournaments(tList)

        // For each tournament, fetch match count to determine completed vs abandoned
        const counts = {}
        await Promise.all(
          tList.map(async (t) => {
            try {
              const mRes = await api.get(`/matches?tournamentId=${t.id}`)
              const played = (mRes.data?.data ?? []).filter(
                m => m.status === 'COMPLETED' || m.status === 'LIVE' || m.status === 'ABANDONED'
              ).length
              counts[t.id] = played
            } catch {
              counts[t.id] = 0
            }
          })
        )
        setMatchCounts(counts)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 rounded-[2rem] flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.2)]">
            <Trophy className="w-10 h-10 text-[var(--color-gold)]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">Premier <span className="text-[var(--color-gold)]">Tournaments</span></h1>
            <p className="text-slate-400 font-light">Explore elite cricket competitions and leagues.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="glass rounded-[2rem] h-48 animate-pulse" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-32 glass rounded-[2rem]">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="font-bold text-xl text-white mb-2 uppercase tracking-wide">No Tournaments</h3>
            <p className="text-slate-400 font-light">There are no tournaments available right now.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 gap-8"
          >
            {tournaments.map(t => (
              <motion.div 
                key={t.id} 
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                className="glass-card p-8 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wide mb-2 group-hover:text-[var(--color-gold)] transition-colors">{t.name}</h3>
                    {(() => {
                      const eff = getEffectiveStatus(t, matchCounts)
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[eff] ?? STATUS_STYLES.UPCOMING}`}>
                          {eff}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[var(--color-gold)]/50 transition-colors">
                    <Trophy className="w-7 h-7 text-slate-400 group-hover:text-[var(--color-gold)] transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[var(--color-electric-blue)]" />
                    {new Date(t.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--color-electric-blue)]" />
                    {t.location}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
