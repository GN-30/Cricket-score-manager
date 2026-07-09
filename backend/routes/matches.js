const express = require('express')
const router = express.Router()
const { supabase } = require('../lib/supabase')
const { authMiddleware } = require('../middleware/auth')

const TABLE = 'Match'

// GET /api/matches
router.get('/', async (req, res) => {
  try {
    const { status, format, tournamentId } = req.query
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false })

    if (status) query = query.eq('status', status)
    if (format) query = query.eq('format', format)
    if (tournamentId) query = query.eq('tournamentId', tournamentId)

    const { data: matches, error } = await query
    if (error) throw error

    // Manually fetch and map teams to avoid PGRST200 error if foreign keys are missing
    const { data: teams, error: teamsError } = await supabase.from('Team').select('*')
    if (teamsError) throw teamsError

    const teamsMap = {}
    if (teams) {
      teams.forEach(t => teamsMap[t.id] = t)
    }

    const data = (matches || []).map(m => ({
      ...m,
      homeTeam: teamsMap[m.homeTeamId] || null,
      awayTeam: teamsMap[m.awayTeamId] || null
    }))

    res.json({ data })
  } catch (err) {
    console.error('GET /matches:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: match, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!match) return res.status(404).json({ error: 'Match not found' })

    const { data: teams, error: teamsError } = await supabase
      .from('Team')
      .select('*')
      .in('id', [match.homeTeamId, match.awayTeamId])
    if (teamsError) throw teamsError

    const teamsMap = {}
    if (teams) {
      teams.forEach(t => teamsMap[t.id] = t)
    }

    const data = {
      ...match,
      homeTeam: teamsMap[match.homeTeamId] || null,
      awayTeam: teamsMap[match.awayTeamId] || null
    }

    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/matches (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { homeTeamId, awayTeamId, venue, date, format, tournamentId, status } = req.body
    if (!homeTeamId || !awayTeamId || !venue || !date) {
      return res.status(400).json({ error: 'homeTeamId, awayTeamId, venue and date are required' })
    }
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ id: Date.now().toString(), homeTeamId, awayTeamId, venue, date, format: format || 'T20', tournamentId, status: status || 'SCHEDULED', updatedAt: new Date().toISOString() }])
      .select()
      .single()
    if (error) throw error
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/matches/:id (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...req.body, updatedAt: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/matches/:id (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Match deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
