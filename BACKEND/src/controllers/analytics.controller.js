const { validationResult } = require('express-validator');
const SocialMetric = require('../models/SocialMetric');
const IntegrationAccount = require('../models/IntegrationAccount');
const axios = require('axios');
const { getValidAccessToken } = require('../services/integrations/token.helper');

exports.recordMetrics = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const doc = await SocialMetric.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to record metrics' });
  }
};

exports.listMetrics = async (req, res) => {
  const { projectId } = req.params;
  const { platform, from, to } = req.query;
  try {
    const query = { project: projectId };
    if (platform) query.platform = platform;
    if (from || to) {
      query.capturedAt = {};
      if (from) query.capturedAt.$gte = new Date(from);
      if (to) query.capturedAt.$lte = new Date(to);
    }
    const items = await SocialMetric.find(query).sort({ capturedAt: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list metrics' });
  }
};

// POST /api/analytics/fetch
// body: { project: <projectId>, accountId?: <integrationAccountId> }
exports.fetchMetrics = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { project, accountId } = req.body;
  try {
    const query = { user: req.user.id };
    if (accountId) query._id = accountId;
    const accounts = await IntegrationAccount.find(query);
    if (!accounts || accounts.length === 0) return res.status(404).json({ error: 'No integration accounts found' });

    const results = [];
    for (const acc of accounts) {
      if (acc.platform !== 'youtube') continue;
      try {
        const token = await getValidAccessToken(acc);
        const { data } = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=statistics&id=' + encodeURIComponent(acc.metadata.channelId), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const channel = data.items && data.items[0];
        const metrics = channel ? {
          subscribers: channel.statistics?.subscriberCount ? Number(channel.statistics.subscriberCount) : null,
          views: channel.statistics?.viewCount ? Number(channel.statistics.viewCount) : null,
          videos: channel.statistics?.videoCount ? Number(channel.statistics.videoCount) : null,
        } : {};

        const doc = await SocialMetric.create({
          project,
          platform: 'youtube',
          accountId: acc.metadata.channelId,
          metrics,
          capturedAt: new Date(),
        });
        results.push({ account: acc._id, metric: doc });
      } catch (err) {
        console.error('fetchMetrics account error', err.response?.data || err.message || err);
        results.push({ account: acc._id, error: err.message });
      }
    }

    return res.json({ results });
  } catch (e) {
    console.error('fetchMetrics error', e);
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};
