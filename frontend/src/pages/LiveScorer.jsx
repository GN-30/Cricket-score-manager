import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowLeft, Save, Zap, AlertCircle } from 'lucide-react'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'
import { useAuth } from '@/contexts/AuthContext'

const formatOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`

export default function LiveScorer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [match, setMatch] = useState(null)
  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const autoCompleteTriggered = useRef(false)
  
  const [scoreObj, setScoreObj] = useState(null)
  
  const [isTossing, setIsTossing] = useState(false)
  const [tossResult, setTossResult] = useState('')
  const [tossStage, setTossStage] = useState('IDLE') // IDLE, SETUP, FLIPPING, CHOOSING, DONE
  const [tossState, setTossState] = useState({
    callingTeamId: '',
    call: '',
    winnerId: '',
    resultFace: '',
    decision: ''
  })
  
  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const { data: { data: matchData } } = await api.get(`/matches/${id}`)
      setMatch(matchData)
      
      const { data: { data: hPlayers } } = await api.get(`/players?teamId=${matchData.homeTeamId}`)
      const { data: { data: aPlayers } } = await api.get(`/players?teamId=${matchData.awayTeamId}`)
      
      setHomePlayers(hPlayers)
      setAwayPlayers(aPlayers)
      
      if (matchData.score) {
        setScoreObj(matchData.score)
      } else {
        // Initialize default score structure
        setScoreObj({
          innings: [
            {
              teamId: matchData.homeTeamId,
              totalRuns: 0,
              wickets: 0,
              balls: 0,
              batsmen: {},
              bowlers: {}
            }
          ],
          currentStrikerId: '',
          currentNonStrikerId: '',
          currentBowlerId: '',
          currentInningsIndex: 0
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fireConfetti = (type) => {
    if (type === 'W') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ff0000', '#220000'] })
    } else if (type === 4 || type === 6) {
      confetti({ particleCount: type === 6 ? 150 : 80, spread: 90, origin: { y: 0.6 }, colors: ['#ffd700', '#ff9500'] })
    } else if (type === 'WIN') {
      const end = Date.now() + 3 * 1000;
      const colors = ['#39ff8e', '#00d4ff'];
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }
  }

  const handleScore = (runs, isWicket = false, isExtra = false) => {
    if (!scoreObj.currentStrikerId || !scoreObj.currentBowlerId) {
      alert("Please select Striker and Bowler first.")
      return
    }

    const { currentInningsIndex, currentStrikerId, currentNonStrikerId, currentBowlerId } = scoreObj
    const innings = [...scoreObj.innings]
    const currInn = { ...innings[currentInningsIndex] }
    
    // Initialize stats if missing
    if (!currInn.batsmen[currentStrikerId]) {
      currInn.batsmen[currentStrikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0 }
    }
    if (!currInn.bowlers[currentBowlerId]) {
      currInn.bowlers[currentBowlerId] = { balls: 0, runs: 0, wickets: 0 }
    }

    const batsman = currInn.batsmen[currentStrikerId]
    const bowler = currInn.bowlers[currentBowlerId]

    // Update Team Total
    currInn.totalRuns += runs
    if (!isExtra) {
      currInn.balls += 1
      batsman.balls += 1
      bowler.balls += 1
    }
    
    if (isWicket) {
      currInn.wickets += 1
      bowler.wickets += 1
      fireConfetti('W')
    } else if (!isExtra) {
      batsman.runs += runs
      bowler.runs += runs
      if (runs === 4) { batsman.fours += 1; fireConfetti(4) }
      if (runs === 6) { batsman.sixes += 1; fireConfetti(6) }
    }

    innings[currentInningsIndex] = currInn
    
    // Rotate strike if odd runs (and not end of over) or end of over without odd runs
    let nextStriker = currentStrikerId
    let nextNonStriker = currentNonStrikerId

    const isEndOfOver = currInn.balls > 0 && currInn.balls % 6 === 0
    const runsAreOdd = runs % 2 !== 0

    // Swap logic
    let shouldSwap = false
    if (runsAreOdd && !isEndOfOver) shouldSwap = true
    if (!runsAreOdd && isEndOfOver) shouldSwap = true

    if (shouldSwap) {
      nextStriker = currentNonStrikerId
      nextNonStriker = currentStrikerId
    }

    let newScoreObj = {
      ...scoreObj,
      innings,
      currentStrikerId: isWicket ? '' : nextStriker,
      currentNonStrikerId: nextNonStriker,
      currentBowlerId: isEndOfOver ? '' : currentBowlerId
    }

    setScoreObj(newScoreObj)
  }

  const saveScore = async () => {
    setSaving(true)
    try {
      const newStatus = match.status === 'SCHEDULED' ? 'LIVE' : match.status
      await api.put(`/matches/${id}`, {
        score: scoreObj,
        status: newStatus,
      })
      const { data: { data } } = await api.get(`/matches/${id}`)
      setMatch(data)
      alert('Score saved successfully!')
    } catch (err) {
      console.error(err)
      alert(`Failed to save score: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const completeMatch = async (auto = false) => {
    if (!auto && !window.confirm("Are you sure you want to complete this match?")) return;
    setSaving(true)
    try {
      let winnerId = null;
      if (scoreObj?.innings?.length > 1) {
        const inn1 = scoreObj.innings[0];
        const inn2 = scoreObj.innings[1];
        if (inn2.totalRuns > inn1.totalRuns) {
          winnerId = inn2.teamId;
        } else if (inn1.totalRuns > inn2.totalRuns) {
          winnerId = inn1.teamId;
        } else {
          winnerId = 'TIE';
        }
      }
      
      const newScoreObj = { ...scoreObj, winnerId };
      
      await api.put(`/matches/${id}`, { status: 'COMPLETED', score: newScoreObj })
      setMatch({ ...match, status: 'COMPLETED', score: newScoreObj })
      setScoreObj(newScoreObj)
      fireConfetti('WIN')
    } catch (err) {
      alert(`Failed to complete match: ${err?.response?.data?.error || err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const startToss = () => {
    setTossStage('SETUP')
  }

  const flipCoin = () => {
    if (!tossState.callingTeamId || !tossState.call) {
      alert("Please select the calling team and their call.")
      return
    }
    setTossStage('FLIPPING')
    
    setTimeout(() => {
      const resultFace = Math.random() > 0.5 ? 'Heads' : 'Tails'
      const callingTeamWon = resultFace === tossState.call
      
      const winnerId = callingTeamWon 
        ? tossState.callingTeamId 
        : (tossState.callingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId)
        
      setTossState(prev => ({ ...prev, winnerId, resultFace }))
      setTossStage('CHOOSING')
    }, 2500)
  }

  const makeDecision = (decision) => {
    setTossState(prev => ({ ...prev, decision }))
    
    const winnerName = tossState.winnerId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name
    setTossResult(`${winnerName} won the toss and elected to ${decision} first.`)
    
    const battingTeamId = decision === 'bat' 
      ? tossState.winnerId 
      : (tossState.winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId)
      
    setScoreObj(prev => {
      const newInnings = [...prev.innings]
      if (newInnings.length > 0 && newInnings[0].balls === 0) {
        newInnings[0].teamId = battingTeamId
      }
      return { ...prev, innings: newInnings }
    })
    
    setTossStage('DONE')
    fireConfetti('WIN')
  }

  const startNextInnings = () => {
    if (scoreObj.currentInningsIndex >= 1) return;
    const firstInningsTeamId = scoreObj.innings[0].teamId;
    const secondInningsTeamId = firstInningsTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    const newInnings = {
      teamId: secondInningsTeamId,
      totalRuns: 0,
      wickets: 0,
      balls: 0,
      batsmen: {},
      bowlers: {}
    }
    setScoreObj({
      ...scoreObj,
      innings: [...scoreObj.innings, newInnings],
      currentInningsIndex: 1,
      currentStrikerId: '',
      currentNonStrikerId: '',
      currentBowlerId: ''
    })
  }

  let matchOvers = 20;
  let matchPlayersPerTeam = 11;
  try {
    const parsed = JSON.parse(match?.format || '{}');
    if (parsed && parsed.overs) {
      matchOvers = Number(parsed.overs);
      matchPlayersPerTeam = Number(parsed.playersPerTeam);
    }
  } catch (e) {}

  const maxBalls = matchOvers * 6;
  const maxWickets = matchPlayersPerTeam <= 5 ? matchPlayersPerTeam : matchPlayersPerTeam - 1;

  const currInn = scoreObj?.innings?.[scoreObj?.currentInningsIndex]
  const isFirstInnings = scoreObj?.currentInningsIndex === 0
  const isCurrentInningsOver = currInn?.wickets >= maxWickets || currInn?.balls >= maxBalls
  const firstInningsScore = scoreObj?.innings?.[0]?.totalRuns
  const target = !isFirstInnings && scoreObj?.innings?.[0] ? firstInningsScore + 1 : null
  const isMatchOver = (!isFirstInnings && isCurrentInningsOver) || (target && currInn?.totalRuns >= target)

  useEffect(() => {
    if (isMatchOver && match?.status === 'LIVE' && !saving && scoreObj && !autoCompleteTriggered.current) {
      autoCompleteTriggered.current = true;
      completeMatch(true);
    }
  }, [isMatchOver, match?.status, saving, scoreObj]);

  if (loading) return <div className="h-screen flex items-center justify-center text-white"><Zap className="animate-pulse w-12 h-12 text-red-500" /></div>

  const battingTeamId = currInn?.teamId
  const bowlingTeamId = battingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId
  
  const battingPlayers = battingTeamId === match.homeTeamId ? homePlayers : awayPlayers
  const bowlingPlayers = bowlingTeamId === match.homeTeamId ? homePlayers : awayPlayers

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>

        {/* Top Bar */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-black/40">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black uppercase text-white tracking-widest flex items-center gap-3">
              {match.homeTeam?.shortName} <span className="text-red-500 text-sm">VS</span> {match.awayTeam?.shortName}
            </h1>
            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-md border ${match.status === 'LIVE' ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {match.status}
            </span>
          </div>

          <div className="flex gap-3">
            {user && match.status !== 'COMPLETED' && (
              <button onClick={saveScore} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors flex items-center gap-2">
                <Save size={16} /> Save Score
              </button>
            )}
            {user && match.status === 'LIVE' && (
              <button onClick={completeMatch} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors">
                End Match
              </button>
            )}
          </div>
        </div>

        {/* Toss Section */}
        {match.status !== 'COMPLETED' && tossStage !== 'DONE' && (
          <div className="glass-card p-6 rounded-3xl border border-white/10 mb-8 bg-black/40 text-center relative overflow-hidden">
            {tossStage === 'IDLE' && user && (
              <button onClick={startToss} className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-3 mx-auto">
                <Zap size={18} /> Start Coin Toss
              </button>
            )}

            {tossStage === 'SETUP' && user && (
              <div className="space-y-6 max-w-lg mx-auto">
                <h3 className="text-yellow-500 font-black uppercase tracking-widest text-xl mb-4">Toss Setup</h3>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-3">Calling Team</p>
                    <div className="flex gap-2">
                      <button onClick={() => setTossState({...tossState, callingTeamId: match.homeTeamId})} className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors ${tossState.callingTeamId === match.homeTeamId ? 'bg-[#00d4ff] text-black' : 'bg-slate-800 text-slate-300'}`}>{match.homeTeam?.shortName}</button>
                      <button onClick={() => setTossState({...tossState, callingTeamId: match.awayTeamId})} className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors ${tossState.callingTeamId === match.awayTeamId ? 'bg-[#00d4ff] text-black' : 'bg-slate-800 text-slate-300'}`}>{match.awayTeam?.shortName}</button>
                    </div>
                  </div>

                  <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-3">Their Call</p>
                    <div className="flex gap-2">
                      <button onClick={() => setTossState({...tossState, call: 'Heads'})} className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors ${tossState.call === 'Heads' ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300'}`}>Heads</button>
                      <button onClick={() => setTossState({...tossState, call: 'Tails'})} className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase transition-colors ${tossState.call === 'Tails' ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300'}`}>Tails</button>
                    </div>
                  </div>
                </div>

                <button onClick={flipCoin} className="w-full bg-green-500 hover:bg-green-600 text-black px-6 py-4 rounded-xl font-black uppercase tracking-widest text-lg transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  Flip Coin
                </button>
              </div>
            )}

            {tossStage === 'FLIPPING' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-spin">
                  <span className="text-4xl font-black text-yellow-900">$</span>
                </div>
                <p className="text-yellow-500 font-bold animate-pulse tracking-widest uppercase text-lg">Flipping in the air...</p>
              </div>
            )}

            {tossStage === 'CHOOSING' && user && (
              <div className="py-4">
                <div className="mb-6">
                  <span className="text-5xl mb-4 block">🪙</span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">It's {tossState.resultFace}!</h3>
                  <p className="text-yellow-500 font-bold text-xl uppercase tracking-wider">
                    {tossState.winnerId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name} wins the toss
                  </p>
                </div>
                <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-4">What do they choose to do?</p>
                <div className="flex justify-center gap-4 max-w-sm mx-auto">
                  <button onClick={() => makeDecision('bat')} className="flex-1 bg-[#00d4ff] hover:bg-[#00b8e6] text-black px-6 py-4 rounded-xl font-black uppercase tracking-widest text-lg transition-colors">
                    Bat
                  </button>
                  <button onClick={() => makeDecision('bowl')} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-lg transition-colors">
                    Bowl
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Display Toss Result (DONE stage) */}
        {tossResult && (
          <div className="glass-card p-4 rounded-2xl border border-yellow-500/30 mb-8 bg-yellow-500/10 text-center flex items-center justify-center gap-3">
            <span className="text-2xl">🪙</span>
            <span className="text-yellow-500 font-black tracking-widest uppercase text-sm">{tossResult}</span>
          </div>
        )}

        {match.status === 'COMPLETED' ? (
          <div className="space-y-6">
            <div className="text-center py-10">
              <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
              <h2 className="text-4xl font-black uppercase text-green-400 mb-2">Match Completed</h2>
              <p className="text-slate-400">Final scorecard — read only.</p>
            </div>

            {/* Read-only innings summary */}
            <div className="space-y-4">
              {scoreObj?.innings?.map((inn, i) => {
                const team = inn.teamId === match.homeTeamId ? match.homeTeam : match.awayTeam
                const overs = `${Math.floor((inn.balls ?? 0) / 6)}.${(inn.balls ?? 0) % 6}`
                return (
                  <div key={i} className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-white uppercase tracking-widest text-sm">
                        {i + 1}{i === 0 ? 'st' : 'nd'} Innings — {team?.name ?? `Team ${i+1}`}
                      </h3>
                      <span className="text-3xl font-black text-white">
                        {inn.totalRuns ?? 0}
                        <span className="text-lg text-slate-400">/{inn.wickets ?? 0}</span>
                        <span className="text-sm text-slate-500 ml-2">({overs} ov)</span>
                      </span>
                    </div>

                    {/* Batsmen table */}
                    {Object.keys(inn.batsmen ?? {}).length > 0 && (
                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/5">
                            <th className="text-left py-2">Batsman</th>
                            <th className="text-right py-2">R</th>
                            <th className="text-right py-2">B</th>
                            <th className="text-right py-2">4s</th>
                            <th className="text-right py-2">6s</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(inn.batsmen).map(([pid, s]) => {
                            const players = inn.teamId === match.homeTeamId ? homePlayers : awayPlayers
                            const player = players.find(p => p.id === pid)
                            return (
                              <tr key={pid} className="border-b border-white/5 text-white">
                                <td className="py-2">{player?.name ?? pid}</td>
                                <td className="text-right font-bold">{s.runs ?? 0}</td>
                                <td className="text-right text-slate-400">{s.balls ?? 0}</td>
                                <td className="text-right text-slate-400">{s.fours ?? 0}</td>
                                <td className="text-right text-slate-400">{s.sixes ?? 0}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Bowlers table */}
                    {Object.keys(inn.bowlers ?? {}).length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/5">
                            <th className="text-left py-2">Bowler</th>
                            <th className="text-right py-2">W</th>
                            <th className="text-right py-2">R</th>
                            <th className="text-right py-2">Balls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(inn.bowlers).map(([pid, s]) => {
                            const bTeamId = inn.teamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId
                            const bPlayers = bTeamId === match.homeTeamId ? homePlayers : awayPlayers
                            const player = bPlayers.find(p => p.id === pid)
                            return (
                              <tr key={pid} className="border-b border-white/5 text-white">
                                <td className="py-2">{player?.name ?? pid}</td>
                                <td className="text-right font-bold text-red-400">{s.wickets ?? 0}</td>
                                <td className="text-right text-slate-400">{s.runs ?? 0}</td>
                                <td className="text-right text-slate-400">{s.balls ?? 0}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              }) ?? <p className="text-slate-500 text-center">No innings data.</p>}
            </div>
          </div>
        ) : (tossResult !== '' || (currInn?.balls > 0) || (scoreObj?.currentInningsIndex > 0)) ? (
          <div className="grid md:grid-cols-12 gap-8">
            
            {/* Main Score Area */}
            <div className="md:col-span-8 space-y-8">
              
              {/* Scoreboard */}
              <div className="glass-card p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent pointer-events-none" />
                
                <h2 className="text-slate-400 font-bold uppercase tracking-widest mb-2 text-sm">
                  {battingTeamId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name} Innings
                </h2>
                
                <div className="flex items-center justify-center gap-6">
                  <div className="text-7xl font-black tracking-tighter text-white">
                    {currInn?.totalRuns}<span className="text-3xl text-slate-500">/{currInn?.wickets}</span>
                  </div>
                </div>
                <div className="text-slate-400 font-medium text-lg mt-2">
                  Overs: <span className="text-white font-bold">{formatOvers(currInn?.balls || 0)}</span>
                </div>

                {target && (
                  <div className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full inline-block">
                    <span className="text-slate-300 font-bold tracking-widest uppercase text-sm">
                      Target: <span className="text-[#39ff8e]">{target}</span>
                    </span>
                  </div>
                )}
                
                {user && scoreObj.currentInningsIndex === 0 && currInn?.balls > 0 && !isCurrentInningsOver && (
                  <button onClick={startNextInnings} className="mt-6 text-xs text-[#00d4ff] hover:text-white uppercase tracking-widest font-bold underline decoration-[#00d4ff]/30 underline-offset-4 transition-colors">
                    Start 2nd Innings Early
                  </button>
                )}
              </div>

              {/* Scoring Controls */}
              {user && !isCurrentInningsOver && !isMatchOver && (
                <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40">
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-4">Add Score</h3>
                  <div className="flex flex-wrap gap-3">
                    {[0, 1, 2, 3, 4, 6].map(runs => (
                      <button key={runs} onClick={() => handleScore(runs)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xl rounded-xl transition-colors">
                        {runs}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => handleScore(0, false, true)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors">
                      Wide / No Ball
                    </button>
                    <button onClick={() => handleScore(0, true)} className="flex-1 py-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 font-black text-lg uppercase tracking-widest rounded-xl transition-colors">
                      Wicket
                    </button>
                  </div>
                </div>
              )}

              {/* Innings/Match Over Alerts */}
              {user && isFirstInnings && isCurrentInningsOver && (
                <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40 text-center">
                  <h3 className="text-xl font-black text-[#00d4ff] uppercase tracking-widest mb-2">First Innings Complete</h3>
                  <p className="text-slate-400 mb-6">Target for next innings is {currInn?.totalRuns + 1}.</p>
                  <button onClick={startNextInnings} className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors">
                    Start 2nd Innings
                  </button>
                </div>
              )}

              {user && isMatchOver && match.status !== 'COMPLETED' && (
                <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40 text-center">
                  <h3 className="text-2xl font-black text-[#39ff8e] uppercase tracking-widest mb-2">Match Finished</h3>
                  <p className="text-slate-400 mb-6">The match has reached its conclusion. {scoreObj?.winnerId && scoreObj.winnerId !== 'TIE' ? `${scoreObj.winnerId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name} have won the match!` : (scoreObj?.winnerId === 'TIE' ? 'The match is a tie!' : '')}</p>
                  <button onClick={completeMatch} className="bg-[#39ff8e] hover:bg-[#2ce67a] text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors">
                    Complete Match
                  </button>
                </div>
              )}

              {match.status === 'COMPLETED' && (
                <div className="glass-card p-6 rounded-3xl border border-white/10 bg-black/40 text-center mt-6">
                  <h3 className="text-2xl font-black text-[#39ff8e] uppercase tracking-widest mb-2">Match Completed</h3>
                  <p className="text-slate-300 font-bold text-lg mb-2">
                    {match.score?.winnerId && match.score.winnerId !== 'TIE' ? `${match.score.winnerId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name} have won the match!` : (match.score?.winnerId === 'TIE' ? 'The match ended in a tie!' : '')}
                  </p>
                </div>
              )}

            </div>

            {/* Sidebar (Players) */}
            {user && (
              <div className="md:col-span-4 space-y-6">
                
                {/* Batting Section */}
                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-black/40">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">On Strike</h3>
                  <select 
                    value={scoreObj.currentStrikerId || ''} 
                    onChange={e => setScoreObj({...scoreObj, currentStrikerId: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 mb-3"
                  >
                    <option value="" disabled>Select Striker</option>
                    {battingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 mt-6">Non-Striker</h3>
                  <select 
                    value={scoreObj.currentNonStrikerId || ''} 
                    onChange={e => setScoreObj({...scoreObj, currentNonStrikerId: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="" disabled>Select Non-Striker</option>
                    {battingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Bowling Section */}
                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-black/40">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Bowling</h3>
                  <select 
                    value={scoreObj.currentBowlerId || ''} 
                    onChange={e => setScoreObj({...scoreObj, currentBowlerId: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#00d4ff]"
                  >
                    <option value="" disabled>Select Bowler</option>
                    {bowlingPlayers.filter(p => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-12 rounded-3xl border border-white/10 bg-black/40 flex flex-col items-center justify-center text-center">
            <Zap size={48} className="text-slate-600 mb-4 opacity-50" />
            <h2 className="text-2xl font-black uppercase text-slate-300 tracking-widest mb-2">Waiting for Toss</h2>
            <p className="text-slate-500 max-w-md">The match scorecard will appear here once the toss has been completed and the innings officially begins.</p>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
