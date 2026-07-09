const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')

// GET /api/auth/me — returns current authenticated user's profile
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
