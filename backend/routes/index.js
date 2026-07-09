const express = require('express')
const router = express.Router()

router.use('/auth',        require('./auth'))
router.use('/tournaments', require('./tournaments'))
router.use('/matches',     require('./matches'))
router.use('/teams',       require('./teams'))
router.use('/players',     require('./players'))

module.exports = router
