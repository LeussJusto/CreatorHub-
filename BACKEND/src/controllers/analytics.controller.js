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
    // Default time window: last 30 days
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const start = startDate.toISOString().slice(0,10);
    const end = endDate.toISOString().slice(0,10);

    for (const acc of accounts) {
      if (acc.platform !== 'youtube') continue;
      try {
        const token = await getValidAccessToken(acc);

        // 1) Channel info (Data API)
        const channelResp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: { part: 'snippet,statistics', id: acc.metadata.channelId },
          headers: { Authorization: `Bearer ${token}` }
        });
        const channel = channelResp.data.items && channelResp.data.items[0];

        const overview = channel ? {
          channelId: acc.metadata.channelId,
          channelTitle: channel.snippet?.title || null,
          channelAvatar: channel.snippet?.thumbnails?.default?.url || null,
          subscriberCount: channel.statistics?.subscriberCount ? Number(channel.statistics.subscriberCount) : null,
          videoCount: channel.statistics?.videoCount ? Number(channel.statistics.videoCount) : null,
        } : {};

        // 2) Performance timeseries (Analytics API)
        const perfMetrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost';
        const perfUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=${encodeURIComponent(perfMetrics)}&dimensions=day`;
        let performanceSeries = [];
        let performanceTotals = {};
        try {
          const perfResp = await axios.get(perfUrl, { headers: { Authorization: `Bearer ${token}` } });
          const rows = perfResp.data.rows || [];
          const headers = (perfResp.data.columnHeaders || []).map(h=>h.name);
          // build series
          performanceSeries = rows.map(r => {
            // r: [dateString, metric1, metric2, ...]
            const obj = { date: r[0] };
            for (let i=1;i<r.length;i++) obj[headers[i]] = Number(r[i]);
            return obj;
          });
          // totals
          performanceTotals = performanceSeries.reduce((accu, row) => {
            accu.views = (accu.views || 0) + (row['views'] || 0);
            accu.estimatedMinutesWatched = (accu.estimatedMinutesWatched || 0) + (row['estimatedMinutesWatched'] || 0);
            accu.subscribersGained = (accu.subscribersGained || 0) + (row['subscribersGained'] || 0);
            accu.subscribersLost = (accu.subscribersLost || 0) + (row['subscribersLost'] || 0);
            return accu;
          }, {});
        } catch (pe) {
          console.warn('perf analytics failed', pe.response?.data || pe.message || pe);
        }

        // 3) Audience by country
        let audienceByCountry = [];
        try {
          const audUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=views&dimensions=country&sort=-views&maxResults=10`;
          const audResp = await axios.get(audUrl, { headers: { Authorization: `Bearer ${token}` } });
          const audRows = audResp.data.rows || [];
          audienceByCountry = audRows.map(r => ({ country: r[0], views: Number(r[1]) }));
        } catch (ae) { console.warn('audience country failed', ae.response?.data || ae.message || ae); }

        // 4) Audience by age/gender
        let audienceByAgeGender = [];
        try {
          const agUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=views&dimensions=ageGroup,gender`;
          const agResp = await axios.get(agUrl, { headers: { Authorization: `Bearer ${token}` } });
          const agRows = agResp.data.rows || [];
          audienceByAgeGender = agRows.map(r => ({ ageGroup: r[0], gender: r[1], views: Number(r[2]) }));
        } catch (ageErr) { console.warn('audience age/gender failed', ageErr.response?.data || ageErr.message || ageErr); }

        // 4b) Audience by device type
        let audienceByDevices = [];
        try {
          const devUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=views&dimensions=deviceType&sort=-views&maxResults=10`;
          const devResp = await axios.get(devUrl, { headers: { Authorization: `Bearer ${token}` } });
          const devRows = devResp.data.rows || [];
          // map deviceType codes to friendly labels
          const mapLabel = (dt) => {
            if (!dt) return 'Otros';
            const d = String(dt).toUpperCase();
            if (d.includes('MOBILE')) return 'Móvil';
            if (d.includes('DESKTOP')) return 'Escritorio';
            if (d.includes('TABLET')) return 'Tablet';
            if (d.includes('TV')) return 'TV';
            return dt;
          }
          audienceByDevices = devRows.map(r => ({ label: mapLabel(r[0]), value: Number(r[1]) }));
        } catch (devErr) { console.warn('audience devices failed', devErr.response?.data || devErr.message || devErr); }

        // 4c) Activity by hour of day
        let audienceActivity = [];
        try {
          const hourUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=views&dimensions=hour&sort=hour`;
          const hourResp = await axios.get(hourUrl, { headers: { Authorization: `Bearer ${token}` } });
          const hourRows = hourResp.data.rows || [];
          // build 0..23 full series, fill missing hours with zero
          const hours = Array.from({length:24}, (_,i) => ({ label: `${String(i).padStart(2,'0')}:00`, value: 0 }));
          for (const r of hourRows) {
            const h = Number(r[0]);
            if (!Number.isNaN(h) && h >=0 && h < 24) hours[h].value = Number(r[1]);
          }
          audienceActivity = hours;
        } catch (hourErr) { console.warn('audience hour activity failed', hourErr.response?.data || hourErr.message || hourErr); }

        // 5) Top videos and per-video daily series (limit to 5)
        let perVideo = [];
        try {
          const searchResp = await axios.get('https://www.googleapis.com/youtube/v3/search', { params: { part: 'id,snippet', channelId: acc.metadata.channelId, order: 'viewCount', type: 'video', maxResults: 5 }, headers: { Authorization: `Bearer ${token}` } });
          const vids = (searchResp.data.items || []).map(i => ({ id: i.id.videoId, title: i.snippet.title }));
          for (const v of vids) {
            try {
              const vUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${encodeURIComponent(acc.metadata.channelId)}&startDate=${start}&endDate=${end}&metrics=views&dimensions=day&filters=video==${encodeURIComponent(v.id)}`;
              const vResp = await axios.get(vUrl, { headers: { Authorization: `Bearer ${token}` } });
              const rows = vResp.data.rows || [];
              const series = rows.map(r => ({ date: r[0], views: Number(r[1]) }));
              perVideo.push({ videoId: v.id, title: v.title, series });
            } catch (ve) { console.warn('per-video series failed', ve.response?.data || ve.message || ve); }
          }
        } catch (sErr) { console.warn('top videos fetch failed', sErr.response?.data || sErr.message || sErr); }

        const metrics = {
          overview,
          performance: { totals: performanceTotals, series: performanceSeries },
          audience: { byCountry: audienceByCountry, byAgeGender: audienceByAgeGender, devices: audienceByDevices, activitySeries: audienceActivity },
          perVideo,
        };

        // Upsert: keep a single SocialMetric per project+platform+accountId
        let doc = null;
        try {
          const existing = await SocialMetric.findOne({ project, platform: 'youtube', accountId: acc.metadata.channelId });
          if (!existing) {
            doc = await SocialMetric.create({ project, platform: 'youtube', accountId: acc.metadata.channelId, metrics, capturedAt: new Date() });
          } else {
            // Only update if metrics have changed to avoid noisy writes
            const oldJson = JSON.stringify(existing.metrics || {});
            const newJson = JSON.stringify(metrics || {});
            if (oldJson !== newJson) {
              existing.metrics = metrics;
              existing.capturedAt = new Date();
              await existing.save();
            }
            doc = existing;
          }
        } catch (saveErr) {
          console.warn('failed to upsert SocialMetric', saveErr);
        }
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
