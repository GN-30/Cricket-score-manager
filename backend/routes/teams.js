const express = require('express')
const router = express.Router()
const { supabase } = require('../lib/supabase')
const { authMiddleware } = require('../middleware/auth')

const TABLE = 'Team'

// GET /api/teams
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /teams:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Team not found' })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/teams (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, shortName, logoUrl } = req.body
    if (!name || !shortName) return res.status(400).json({ error: 'name and shortName are required' })
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ id: Date.now().toString(), name, shortName, logoUrl, updatedAt: new Date().toISOString() }])
      .select()
      .single()
    if (error) throw error
    res.status(201).json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/teams/:id (protected)
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

// DELETE /api/teams/:id (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Team deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
