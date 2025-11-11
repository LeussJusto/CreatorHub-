const IntegrationAccount = require('../models/IntegrationAccount');
const { validationResult } = require('express-validator');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getValidAccessToken } = require('../services/integrations/token.helper');

function isoDurationToSeconds(duration) {
  // simple parser for ISO 8601 durations like PT1H2M3S or PT2M20S
  if (!duration || typeof duration !== 'string') return null;
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const hours = parseInt(m[1] || '0', 10);
  const mins = parseInt(m[2] || '0', 10);
  const secs = parseInt(m[3] || '0', 10);
  return hours * 3600 + mins * 60 + secs;
}

exports.connectAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { platform, accessToken } = req.body;
  try {
    const account = await IntegrationAccount.create({ user: req.user.id, platform, accessToken });
    res.status(201).json(account);
  } catch (e) {
    res.status(500).json({ error: 'Failed to connect account' });
  }
};

exports.listAccounts = async (req, res) => {
  try {
    const accounts = await IntegrationAccount.find({ user: req.user.id });
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list accounts' });
  }
};

// Start OAuth flow for YouTube: generate a signed state and redirect user to Google consent screen
exports.oauthYoutubeStart = async (req, res) => {
  try {
    // req.user is available because this route should be protected
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Create a short-lived signed state containing the user id and a random nonce
  const nonce = crypto.randomBytes(12).toString('hex');
  const stateTtl = process.env.YT_STATE_TTL || '1h';
  const state = jwt.sign({ sub: userId, nonce }, process.env.JWT_SECRET, { expiresIn: stateTtl });

    const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/youtube/callback`;
    const params = new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    // Dual behavior: if client expects JSON (SPA), return { url }, otherwise redirect
    const accept = (req.get('Accept') || '').toLowerCase();
    if (accept.includes('application/json')) {
      return res.json({ url });
    }
    return res.redirect(url);
  } catch (e) {
    console.error('oauthYoutubeStart error', e);
    return res.status(500).json({ error: 'Failed to start YouTube OAuth' });
  }
};

// Callback route for YouTube OAuth: exchange code for tokens and save IntegrationAccount
exports.oauthYoutubeCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    // Verify state to obtain the user id
    let payload;
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      // If the state JWT expired, inform the frontend so it can retry the flow
      if (err && err.name === 'TokenExpiredError') {
        console.warn('oauthYoutubeCallback: state token expired');
        const client = process.env.CLIENT_ORIGIN || '/';
        return res.redirect(`${client.replace(/\/$/, '')}/integrations?error=state_expired`);
      }
      throw err;
    }
    const userId = payload.sub;

    // Exchange code for tokens
    const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/youtube/callback`;
    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = tokenResp.data;

    // Fetch channel/profile info
    const me = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const channel = me.data.items && me.data.items[0];

    const accountData = {
      user: userId,
      platform: 'youtube',
      accessToken: access_token,
      refreshToken: refresh_token || undefined,
      metadata: {
        channelId: channel?.id,
        title: channel?.snippet?.title,
        raw: channel || {}
      },
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
    };

    // Upsert: if user already has an integration for this channel, replace it, otherwise create
    let account = await IntegrationAccount.findOne({ user: userId, platform: 'youtube', 'metadata.channelId': channel?.id });
    if (account) {
      account.accessToken = accountData.accessToken;
      if (accountData.refreshToken) account.refreshToken = accountData.refreshToken;
      account.metadata = accountData.metadata;
      account.expiresAt = accountData.expiresAt;
      await account.save();
    } else {
      account = await IntegrationAccount.create(accountData);
    }

    // Log success for debugging and redirect user back to frontend app success page
    console.log(`Saved YouTube Integration: ${channel?.id || 'unknown-channel'} for user ${userId}`);
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations/success?connected=youtube`);
  } catch (err) {
    console.error('oauthYoutubeCallback error', err.response?.data || err.message || err);
    // If callback is hit directly (no auth header) we still respond gracefully
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations?connected=youtube&error=1`);
  }
};

// Metrics fetching moved to analytics.controller.js

// List videos for a specific integration account (YouTube)
exports.listAccountVideos = async (req, res) => {
  const { id } = req.params;
  const shortsOnly = req.query.shortsOnly === '1' || req.query.shortsOnly === 'true';
  const publicOnly = req.query.publicOnly === '1' || req.query.publicOnly === 'true';
  try {
    const acc = await IntegrationAccount.findOne({ _id: id, user: req.user.id });
    if (!acc) return res.status(404).json({ error: 'Integration account not found' });
    if (acc.platform !== 'youtube') return res.status(400).json({ error: 'Not a YouTube integration' });

    const token = await getValidAccessToken(acc);
    const channelId = acc.metadata && acc.metadata.channelId;
    if (!channelId) return res.status(400).json({ error: 'Integration account has no channelId' });

    // Search for recent videos on the channel
    const searchParams = new URLSearchParams({ part: 'id', channelId, maxResults: '50', type: 'video', order: 'date' });
    const searchResp = await axios.get('https://www.googleapis.com/youtube/v3/search?' + searchParams.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ids = (searchResp.data.items || []).map(i => i.id && i.id.videoId).filter(Boolean);
    if (!ids || ids.length === 0) return res.json({ videos: [] });

    // Fetch video details
    const vidParams = new URLSearchParams({ part: 'snippet,contentDetails,statistics,status', id: ids.join(','), maxResults: '50' });
    const vidsResp = await axios.get('https://www.googleapis.com/youtube/v3/videos?' + vidParams.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    const videos = (vidsResp.data.items || []).map(v => {
      const duration = v.contentDetails && v.contentDetails.duration;
      const seconds = isoDurationToSeconds(duration);
      return {
        id: v.id,
        title: v.snippet?.title,
        publishedAt: v.snippet?.publishedAt,
        duration,
        durationSeconds: seconds,
        privacy: v.status?.privacyStatus,
        statistics: v.statistics || {},
      };
    });

    let filtered = videos;
    if (publicOnly) filtered = filtered.filter(v => !v.privacy || v.privacy === 'public');
    if (shortsOnly) filtered = filtered.filter(v => (typeof v.durationSeconds === 'number') ? (v.durationSeconds <= 60) : false);

    return res.json({ videos: filtered });
  } catch (err) {
    console.error('listAccountVideos error', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Failed to list videos' });
  }
};
