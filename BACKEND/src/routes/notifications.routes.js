const router = require('express').Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired } = require('../middleware/auth');
const { getMyNotifications, markAsRead } = require('../controllers/notifications.controller');

router.use(authRequired);

router.get('/', getMyNotifications);

router.patch('/:id/read', [ param('id').isMongoId() ], validate, markAsRead);

module.exports = router;
