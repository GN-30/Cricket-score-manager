const express = require('express')
const router = express.Router()
const { supabase } = require('../lib/supabase')
const { authMiddleware } = require('../middleware/auth')

// NOTE: Table names below match the Prisma model names (PascalCase).
// If you created tables via Supabase Dashboard, they may be lowercase — adjust accordingly.
const TABLE = 'Tournament'

// GET /api/tournaments — list all
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('createdAt', { ascending: false })
    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /tournaments:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tournaments/:id — get one with related teams & matches
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Tournament not found' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tournaments — create (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, startDate, endDate, status, format, teams, settings } = req.body
    if (!name || !startDate) return res.status(400).json({ error: 'name and startDate are required' })
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ 
        id: Date.now().toString(), 
        name, 
        startDate, 
        endDate, 
        status: status || 'UPCOMING', 
        format,
        teams,
        settings,
        updatedAt: new Date().toISOString() 
      }])
      .select()
      .single()
    if (error) throw error
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/tournaments/:id — update (protected)
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

// DELETE /api/tournaments/:id — delete (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Tournament deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
