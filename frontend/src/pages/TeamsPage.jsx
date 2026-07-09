import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, MapPin, Users } from 'lucide-react'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100 } }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/teams')
      .then(res => setTeams(res.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-[var(--color-electric-blue)]/10 border border-[var(--color-electric-blue)]/30 rounded-[2rem] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.2)]">
            <Shield className="w-10 h-10 text-[var(--color-electric-blue)]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">Franchise <span className="text-[var(--color-electric-blue)]">Teams</span></h1>
            <p className="text-slate-400 font-light">View the active squads competing this season.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="glass rounded-[2rem] h-56 animate-pulse" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-32 glass rounded-[2rem]">
            <Shield className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="font-bold text-xl text-white mb-2 uppercase tracking-wide">No Teams Found</h3>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {teams.map(team => (
              <motion.div 
                key={team.id} 
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.05 }}
                className="glass-card p-6 flex flex-col items-center text-center cursor-pointer group"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-3xl font-black text-white mb-6 group-hover:border-[var(--color-electric-blue)] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all">
                  {team.shortName}
                </div>
                
                <h3 className="text-xl font-black text-white uppercase tracking-wide mb-1 group-hover:text-[var(--color-electric-blue)] transition-colors">{team.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-widest mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {team.city || 'Global'}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
