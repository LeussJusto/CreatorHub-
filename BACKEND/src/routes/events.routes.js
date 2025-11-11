const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { createEvent, listEvents, updateEvent, deleteEvent } = require('../controllers/events.controller');
const validate = require('../middleware/validate');

router.use(authRequired);

router.post('/', [
  body('projectId').isMongoId(),
  body('title').isString().notEmpty(),
  body('start').isISO8601(),
  body('end').isISO8601(),
], validate, createEvent);

router.get('/:projectId', [
  param('projectId').isMongoId(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], validate, listEvents);

router.put('/:eventId', [
  param('eventId').isMongoId(),
], validate, updateEvent);

router.delete('/:eventId', [
  param('eventId').isMongoId(),
], validate, deleteEvent);

module.exports = router;
