const router = require('express').Router();
const { body } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { analyzeMetrics } = require('../controllers/ai.controller');
const validate = require('../middleware/validate');

router.use(authRequired);

router.post('/analyze', [
  body('platform').isString().notEmpty(),
  body('question').isString().notEmpty(),
  body('metrics').optional(),
  body('account').optional(),
], validate, analyzeMetrics);

module.exports = router;

