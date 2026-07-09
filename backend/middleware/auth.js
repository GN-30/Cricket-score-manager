const { supabase } = require('../lib/supabase')

/**
 * Verifies the Supabase JWT token sent from the frontend.
 * Attach Authorization: Bearer <token> header in requests.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (err) {
    console.error('Auth middleware error:', err.message)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

module.exports = { authMiddleware }
