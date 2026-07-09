import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Activity } from 'lucide-react'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
}

const ROLE_COLORS = {
  BATSMAN:     'text-[var(--color-electric-blue)] bg-[var(--color-electric-blue)]/10 border-[var(--color-electric-blue)]/30',
  BOWLER:      'text-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 border-[var(--color-neon-green)]/30',
  ALL_ROUNDER: 'text-[var(--color-gold)] bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30',
  WICKET_KEEPER: 'text-purple-400 bg-purple-400/10 border-purple-400/30'
}

export default function PlayersPage() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/players')
      .then(res => setPlayers(res.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/30 rounded-[2rem] flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.2)]">
            <Users className="w-10 h-10 text-[var(--color-neon-green)]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">Pro <span className="text-[var(--color-neon-green)]">Roster</span></h1>
            <p className="text-slate-400 font-light">The complete database of professional athletes.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-32 glass rounded-[2rem]">
            <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="font-bold text-xl text-white mb-2 uppercase tracking-wide">No Players Found</h3>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4"
          >
            {players.map(p => {
              const roleStyle = ROLE_COLORS[p.role] || 'text-slate-300 bg-white/10 border-white/20'
              
              return (
                <motion.div 
                  key={p.id} 
                  variants={itemVariants}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-white group-hover:border-[var(--color-electric-blue)] transition-colors">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-white truncate text-sm mb-1">{p.name}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${roleStyle}`}>
                      {p.role.replace('_', ' ')}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
