const router = require('express').Router();
const { param } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { listMyNotifications, markRead } = require('../controllers/notifications.controller');

router.use(authRequired);

router.get('/', listMyNotifications);
router.patch('/:id/read', [param('id').isMongoId()], markRead);

module.exports = router;
