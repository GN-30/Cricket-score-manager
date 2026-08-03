const express = require('express')
const router = express.Router()
const { supabase } = require('../lib/supabase')

const TABLE = 'Comment'

// GET /api/comments?matchId=xxx — fetch last 100 comments for a match
router.get('/', async (req, res) => {
  try {
    const { matchId } = req.query
    if (!matchId) return res.status(400).json({ error: 'matchId query param is required' })

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('matchId', matchId)
      .order('createdAt', { ascending: true })
      .limit(100)

    if (error) throw error
    res.json({ data: data || [] })
  } catch (err) {
    console.error('GET /comments:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/comments — insert a new comment (public, no auth required)
router.post('/', async (req, res) => {
  try {
    const { matchId, authorName, authorId, text } = req.body

    if (!matchId || !authorName || !text) {
      return res.status(400).json({ error: 'matchId, authorName and text are required' })
    }
    if (text.length > 300) {
      return res.status(400).json({ error: 'Comment must be 300 characters or fewer' })
    }
    if (authorName.trim().length < 1) {
      return res.status(400).json({ error: 'Author name cannot be empty' })
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert([{
        matchId,
        authorName: authorName.trim().slice(0, 40),
        authorId: authorId || null,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ data })
  } catch (err) {
    console.error('POST /comments:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/comments/:id — admin only (future use)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Comment deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
