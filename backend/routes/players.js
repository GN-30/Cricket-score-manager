const express = require('express')
const router = express.Router()
const { supabase } = require('../lib/supabase')
const { authMiddleware } = require('../middleware/auth')

const TABLE = 'Player'

// GET /api/players — supports ?teamId=... and ?role=...
router.get('/', async (req, res) => {
  try {
    const { teamId, role } = req.query
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('name', { ascending: true })

    if (teamId) query = query.eq('teamId', teamId)
    if (role)   query = query.eq('role', role)

    const { data, error } = await query
    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /players:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/players/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Player not found' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/players (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, teamId, role } = req.body
    if (!name || !teamId) return res.status(400).json({ error: 'name and teamId are required' })
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ id: Date.now().toString(), name, teamId, role: role || 'BATSMAN', updatedAt: new Date().toISOString() }])
      .select()
      .single()
    if (error) throw error
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/players/:id (protected)
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

// DELETE /api/players/:id (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Player deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
