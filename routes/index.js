const router = require('express').Router()

router.use('/auth', require('./auth.route'))
router.use('/customers', require('./customer.route'))
router.use('/todos', require('./todo.route'))
router.use('/jobtype', require('./job_type.route'))
router.use('/joblevel', require('./job_level.route'))
router.use('/jobs', require('./job.route'))
router.use('/chat_room', require('./chat_room.route'))

module.exports = router