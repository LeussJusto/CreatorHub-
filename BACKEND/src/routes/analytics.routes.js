const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics.service');
const { body, param, query } = require('express-validator');
const { recordMetrics, listMetrics, fetchMetrics } = require('../controllers/analytics.controller');

router.use(authRequired);

router.get('/overview/:projectId', async (req, res) => {
  try {
    const data = await AnalyticsService.getProjectOverview(req.params.projectId, req.user.id);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.post('/metrics', [
  body('project').isMongoId(),
  body('platform').isIn(['twitch', 'youtube']),
], recordMetrics);

// Trigger a metrics fetch from connected integration accounts (e.g. YouTube)
router.post('/fetch', [
  body('project').isMongoId(),
], fetchMetrics);

router.get('/metrics/:projectId', [
  param('projectId').isMongoId(),
  query('platform').optional().isIn(['twitch', 'youtube']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], listMetrics);

module.exports = router;
