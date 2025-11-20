const IntegrationAccount = require('../models/IntegrationAccount');
const { validationResult } = require('express-validator');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getValidAccessToken } = require('../services/integrations/token.helper');
// TikTok integration removed from backend. Twitch handlers added instead.

// Ensure we can use a Page access token for Page->IG Business calls. Returns a token usable for the page or null.
async function ensurePageAccessToken(pageId, token) {
  if (!pageId || !token) return null;
  try {
    // Try to fetch the page with the provided token. If token is already valid for the page, return it.
    const check = await axios.get(`https://graph.facebook.com/v16.0/${pageId}`, { params: { fields: 'id', access_token: token } });
    if (check && check.data && check.data.id) return token;
  } catch (e) {
    // fallthrough: token not valid for page, try to fetch page tokens via /me/accounts
  }

  try {
    const meAccounts = await axios.get('https://graph.facebook.com/v16.0/me/accounts', { params: { access_token: token } });
    const page = (meAccounts.data && meAccounts.data.data) ? (meAccounts.data.data || []).find(p => String(p.id) === String(pageId)) : null;
    if (page && page.access_token) return page.access_token;
  } catch (err) {
    // fallthrough return null
  }
  return null;
}

// Helper: sanitize objects for server-side logging (redact tokens, codes if needed)
function sanitizeForServerLog(obj) {
  try {
    return JSON.parse(JSON.stringify(obj, (k, v) => {
      if (!k) return v;
      const key = String(k).toLowerCase();
      if (/(token|access|refresh|secret|code)/i.test(key)) return '[REDACTED]';
      return v;
    }));
  } catch (e) {
    try { return String(obj); } catch (e2) { return '[unserializable]'; }
  }
}

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
    // Log token liveness for Instagram accounts to help debugging.
    try {
      for (const a of accounts) {
        if (String(a.platform).toLowerCase() === 'instagram') {
          try {
            if (a.expiresAt && new Date(a.expiresAt) > new Date(Date.now() + 30000)) {
              console.log('instagram token status: alive', { accountId: String(a._id).slice(0,8), expiresAt: a.expiresAt });
            } else {
              // Try to obtain a valid token (may refresh); do not fail the endpoint if this throws
              try {
                const valid = await getValidAccessToken(a);
                if (valid) console.log('instagram token status: valid/refreshed', { accountId: String(a._id).slice(0,8) });
                else console.log('instagram token status: missing', { accountId: String(a._id).slice(0,8) });
              } catch (err) {
                console.log('instagram token status: invalid or refresh failed', { accountId: String(a._id).slice(0,8), err: err && err.message });
              }
            }
          } catch (e) {
            console.log('instagram token status: check error', { accountId: String(a._id).slice(0,8), err: e && e.message });
          }
        }
      }
    } catch (logErr) {
      console.log('listAccounts: token liveness logging failed', logErr && (logErr.message || String(logErr)));
    }
    // Return a lightweight summary for the frontend to show connected state and display name
    const summary = accounts.map(a => {
      const base = { id: a._id, platform: a.platform, createdAt: a.createdAt };
      if (a.platform === 'youtube') {
        const channelTitle = a.metadata && (a.metadata.title || a.metadata.channelTitle || a.metadata.channel_name) || null;
        return Object.assign(base, { connected: true, displayName: channelTitle, raw: a.metadata });
      }
      if (a.platform === 'twitch') {
        const display = a.metadata && (a.metadata.display_name || a.metadata.displayName || (a.metadata.raw && (a.metadata.raw.display_name || a.metadata.raw.login))) || null;
        const openId = a.metadata && (a.metadata.user_id || a.metadata.userId || (a.metadata.raw && (a.metadata.raw.user_id || a.metadata.raw.id))) || null;
        return Object.assign(base, { connected: true, displayName: display, openId, raw: a.metadata });
      }
      // For generic/other platforms (including instagram), prefer readable displayName
      const metadata = a.metadata || {};
      const rawProfile = metadata.raw || metadata;
      const displayName = metadata.username || metadata.title || rawProfile && (rawProfile.username || rawProfile.title || rawProfile.name) || null;
      return Object.assign(base, { connected: true, displayName, raw: rawProfile, metadata });
    });
    res.json(summary);
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
        const client = process.env.CLIENT_ORIGIN || '/';
        return res.redirect(`${client.replace(/\/$/, '')}/?connected=youtube&error=state_expired`);
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

    // Saved YouTube Integration
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations/success?connected=youtube`);
  } catch (err) {
    // oauthYoutubeCallback error
    // If callback is hit directly (no auth header) we still respond gracefully
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations?connected=youtube&error=1`);
  }
};

// Instagram integration: OAuth handlers and basic metrics support added below.

// Start OAuth flow for Instagram
exports.oauthInstagramStart = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const nonce = crypto.randomBytes(12).toString('hex');
    const stateTtl = process.env.INSTAGRAM_STATE_TTL || '1h';
    const state = jwt.sign({ sub: userId, nonce }, process.env.JWT_SECRET, { expiresIn: stateTtl });

    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/instagram/callback`;
    const clientId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.IG_CLIENT_KEY;
    // Use Facebook Login / Graph scopes to access Instagram Business insights/pages
    const scopes = (process.env.INSTAGRAM_SCOPES || 'instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list,business_management');

    try {
      // Log important values for debugging without printing secrets
      const clientIdSample = clientId ? String(clientId).slice(0, 12) : null;
      console.log('oauthInstagramStart:', { redirectUri, scopes, clientIdPresent: !!clientId, clientIdSample, statePrefix: String(state).slice(0,10) });
    } catch (e) {}

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });
    // Use Facebook dialog OAuth to request the requested Graph scopes
    const url = `https://www.facebook.com/v16.0/dialog/oauth?${params.toString()}`;
    const accept = (req.get('Accept') || '').toLowerCase();
    try {
      console.log('oauthInstagramStart: built url (truncated) ->', url && (url.length > 200 ? url.slice(0,200) + '...' : url));
      console.log('oauthInstagramStart: Accept header ->', accept || '(none)');
    } catch (e) {}
    if (accept.includes('application/json')) {
      try { console.log('oauthInstagramStart: returning JSON { url } to SPA'); } catch (e) {}
      return res.json({ url });
    }
    try { console.log('oauthInstagramStart: redirecting user to provider'); } catch (e) {}
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start Instagram OAuth' });
  }
};

// Callback for Instagram OAuth: exchange code for token, upgrade to long-lived token and persist IntegrationAccount
exports.oauthInstagramCallback = async (req, res) => {
  const { code, state } = req.query;
  try { console.log('oauthInstagramCallback: callback received', sanitizeForServerLog(req.query)); } catch (e) {}
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    // Verify state JWT to obtain user id
    let payload;
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      if (err && err.name === 'TokenExpiredError') {
        const client = process.env.CLIENT_ORIGIN || '/';
        return res.redirect(`${client.replace(/\/$/, '')}/integrations?error=state_expired`);
      }
      throw err;
    }
    const userId = payload.sub;

    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/instagram/callback`;

    // 1) Exchange code -> short-lived user token via Graph
    const tokenResp = await axios.get('https://graph.facebook.com/v16.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.IG_CLIENT_KEY || '',
        redirect_uri: redirectUri,
        client_secret: process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || process.env.IG_CLIENT_SECRET || '',
        code: String(code),
      }
    });
    const shortUserToken = tokenResp.data && tokenResp.data.access_token;

    // 2) Exchange short user token -> long-lived user token (best-effort)
    let longUserToken = shortUserToken;
    let userExpiresIn = null;
    try {
      if (shortUserToken) {
        const longResp = await axios.get('https://graph.facebook.com/v16.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.IG_CLIENT_KEY || '',
            client_secret: process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || process.env.IG_CLIENT_SECRET || '',
            fb_exchange_token: shortUserToken,
          }
        });
        if (longResp && longResp.data && longResp.data.access_token) {
          longUserToken = longResp.data.access_token;
          userExpiresIn = longResp.data.expires_in || null;
        }
      }
    } catch (e) {
      try { console.warn('instagram/facebook: user token exchange for long-lived failed, using short token'); } catch (er) {}
    }

    // 3) List pages for the user to find a Page with an instagram_business_account
    let pageAccessToken = null;
    let igUserId = null;
    let pageId = null;
    try {
      const pagesResp = await axios.get('https://graph.facebook.com/v16.0/me/accounts', { params: { access_token: longUserToken } });
      const pages = pagesResp.data && pagesResp.data.data ? pagesResp.data.data : [];
      for (const p of pages) {
        const pAccess = p.access_token;
        const pId = p.id;
        try {
          const pageInfo = await axios.get(`https://graph.facebook.com/v16.0/${pId}`, { params: { fields: 'instagram_business_account', access_token: pAccess } });
          const igAcc = pageInfo.data && pageInfo.data.instagram_business_account;
          if (igAcc && igAcc.id) {
            pageAccessToken = pAccess;
            igUserId = igAcc.id;
            pageId = pId;
            break;
          }
        } catch (e) {
          console.error('oauthInstagramCallback: pageInfo fetch failed for page', pId, { err: e && (e.response?.data || e.message || String(e)) });
          // continue to next page
        }
      }
    } catch (e) {
      console.error('oauthInstagramCallback: failed to list user pages', { err: e && (e.response?.data || e.message || String(e)) });
    }

    // 4) If we found an IG business account, fetch basic profile using the page access token
    let profile = {};
    if (igUserId && pageAccessToken) {
      try {
        // debug token for diagnostics (scopes/type)
        try {
          const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '';
          const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
          if (appId && appSecret) {
            const appToken = `${appId}|${appSecret}`;
            const dbg = await axios.get('https://graph.facebook.com/debug_token', { params: { input_token: pageAccessToken, access_token: appToken } });
            try { console.log('oauthInstagramCallback: debug_token (pageAccessToken) ->', sanitizeForServerLog(dbg.data)); } catch (e) {}
          } else {
            try { console.warn('oauthInstagramCallback: skipping debug_token - FACEBOOK_APP_ID/SECRET missing'); } catch(e){}
          }
        } catch (dbgErr) {
          try { console.warn('oauthInstagramCallback: debug_token failed', dbgErr && (dbgErr.response?.data || dbgErr.message || String(dbgErr))); } catch (e) {}
        }

        const prof = await axios.get(`https://graph.facebook.com/v16.0/${igUserId}`, { params: { fields: 'id,username,profile_picture_url,media_count', access_token: pageAccessToken } });
        profile = prof.data || {};
      } catch (e) {
        console.error('oauthInstagramCallback: failed to fetch IG profile via page token', { igUserId, pageId, err: e && (e.response?.data || e.message || String(e)) });
        profile = { id: igUserId };
      }
    }

    // 5) Build accountData and persist. Prefer storing the Page access token (works for IG Business calls).
    const accountData = {
      user: userId,
      platform: 'instagram',
      accessToken: pageAccessToken || longUserToken || shortUserToken || null,
      refreshToken: undefined,
      expiresAt: userExpiresIn ? new Date(Date.now() + userExpiresIn * 1000) : undefined,
      metadata: Object.assign({ ig_user_id: igUserId || null, page_id: pageId || null, page_access_token: pageAccessToken || null, username: profile.username || null, media_count: profile.media_count || null }, { raw: profile }),
    };

    try {
      let account = await IntegrationAccount.findOne({ user: userId, platform: 'instagram', 'metadata.ig_user_id': igUserId });
      if (account) {
        account.accessToken = accountData.accessToken;
        if (accountData.expiresAt) account.expiresAt = accountData.expiresAt;
        account.metadata = Object.assign(account.metadata || {}, accountData.metadata);
        await account.save();
        try { console.log('oauthInstagramCallback: Instagram account updated', { accountId: String(account._id).slice(0,8), tokenSource: pageAccessToken ? 'page' : (longUserToken ? 'long_user' : 'short_user') }); } catch(e){}
      } else {
        account = await IntegrationAccount.create(accountData);
        try { console.log('oauthInstagramCallback: Instagram account created', { accountId: String(account._id).slice(0,8), tokenSource: pageAccessToken ? 'page' : (longUserToken ? 'long_user' : 'short_user') }); } catch(e){}
      }
    } catch (dbErr) {
      try { console.log('oauthInstagramCallback: failed to save IntegrationAccount', { err: dbErr && (dbErr.message || String(dbErr)), user: String(userId).slice(0,8), igUserId, pageId }); } catch(e){}
      // ignore DB errors during callback persistence
    }

    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations/success?connected=instagram`);
  } catch (err) {
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations?connected=instagram&error=1`);
  }
};

// Start OAuth flow for Twitch
exports.oauthTwitchStart = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const nonce = crypto.randomBytes(12).toString('hex');
    const stateTtl = process.env.TWICH_STATE_TTL || '1h';
    const state = jwt.sign({ sub: userId, nonce }, process.env.JWT_SECRET, { expiresIn: stateTtl });

    const redirectUri = process.env.TWICH_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/twitch/callback`;
    const clientId = process.env.TWICH_CLIENT_KEY;
    const scopes = (process.env.TWICH_SCOPES || 'user:read:email').split(/\s+/).join('+');

    try { console.log('oauthTwitchStart: using redirectUri', redirectUri, 'scopes=', scopes, 'statePrefix=', String(state).slice(0,10)); } catch (e) {}

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });
    const url = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    const accept = (req.get('Accept') || '').toLowerCase();
    if (accept.includes('application/json')) return res.json({ url });
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start Twitch OAuth' });
  }
};

// Callback for Twitch OAuth (minimal): exchange code for tokens and persist IntegrationAccount
exports.oauthTwitchCallback = async (req, res) => {
  const { code, state } = req.query;
  try { console.log('oauthTwitchCallback: callback received', sanitizeForServerLog(req.query)); } catch (e) {}
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    let payload;
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      if (err && err.name === 'TokenExpiredError') {
        const client = process.env.CLIENT_ORIGIN || '/';
        return res.redirect(`${client.replace(/\/$/, '')}/integrations?error=state_expired`);
      }
      throw err;
    }
    const userId = payload.sub;

    const redirectUri = process.env.TWICH_REDIRECT_URI || `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`}/api/integrations/oauth/twitch/callback`;

    // Exchange code for tokens using Twitch token endpoint
    const tokenEndpoint = 'https://id.twitch.tv/oauth2/token';
    const formParams = new URLSearchParams({
      client_id: process.env.TWICH_CLIENT_KEY || '',
      client_secret: process.env.TWICH_CLIENT_SECRET || '',
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString();

    let tokenData = {};
    try {
      const tokenResp = await axios.post(tokenEndpoint, formParams, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      tokenData = tokenResp.data || {};
      try { console.log('oauthTwitchCallback: token exchange success (sanitized)', sanitizeForServerLog(tokenData)); } catch (le) {}
    } catch (tokenErr) {
      const client = process.env.CLIENT_ORIGIN || '/';
      return res.redirect(`${client.replace(/\/$/, '')}/integrations?connected=twitch&error=token_exchange`);
    }

    const accessToken = tokenData.access_token || null;
    const refreshToken = tokenData.refresh_token || undefined;

    const accountData = {
      user: userId,
      platform: 'twitch',
      accessToken,
      refreshToken,
      metadata: {
        raw: tokenData,
      },
    };

    try {
      let account = await IntegrationAccount.findOne({ user: userId, platform: 'twitch', 'metadata.raw.user_id': tokenData.user_id || tokenData.userId || null });
      if (account) {
        account.accessToken = accountData.accessToken;
        if (accountData.refreshToken) account.refreshToken = accountData.refreshToken;
        account.metadata = Object.assign(account.metadata || {}, accountData.metadata);
        await account.save();
      } else {
        account = await IntegrationAccount.create(accountData);
      }
    } catch (dbErr) {
      // ignore DB errors during callback persistence
    }

    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations/success?connected=twitch`);
  } catch (err) {
    const client = process.env.CLIENT_ORIGIN || '/';
    return res.redirect(`${client.replace(/\/$/, '')}/integrations?connected=twitch&error=1`);
  }
};

// Metrics fetching moved to analytics.controller.js

// List videos for a specific integration account (YouTube or TikTok)
exports.listAccountVideos = async (req, res) => {
  const { id } = req.params;
  const shortsOnly = req.query.shortsOnly === '1' || req.query.shortsOnly === 'true';
  const publicOnly = req.query.publicOnly === '1' || req.query.publicOnly === 'true';
  try {
    try { console.log('listAccountVideos: incoming request', { accountId: id, userId: req.user && String(req.user.id).slice(0,8) }); } catch (e) {}
    const acc = await IntegrationAccount.findOne({ _id: id, user: req.user.id });
    if (!acc) return res.status(404).json({ error: 'Integration account not found' });

    // YouTube existing flow
    if (acc.platform === 'youtube') {
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
    }

    // Instagram flow: fetch profile-level insights and recent media + media-level insights
    if (acc.platform === 'instagram') {
      try {
        const token = (typeof getValidAccessToken === 'function') ? await getValidAccessToken(acc) : acc.accessToken;
        if (!token) return res.status(400).json({ error: 'Integration account has no access token. Reconnect the account.' });

        const igUserId = acc.metadata && (acc.metadata.ig_user_id || acc.metadata.user_id || (acc.metadata.raw && (acc.metadata.raw.id || acc.metadata.raw.user_id))) || null;
        if (!igUserId) return res.status(400).json({ error: 'Integration account has no Instagram user id' });

        // For IG Business/Creator flows prefer Facebook Graph v16.0 and Page tokens
        const hasPageId = !!(acc.metadata && (acc.metadata.page_id || acc.metadata.pageId || (acc.metadata.raw && (acc.metadata.raw.page_id || acc.metadata.raw.pageId))));
        const graphBase = 'https://graph.facebook.com/v16.0';
        try { console.log('listAccountVideos: instagram endpoint selection', { accountId: id, graphBase, hasPageId }); } catch (e) {}

        // Debug: log stored metadata and a sanitized token sample to understand why username may be null
        try {
          console.log('listAccountVideos: instagram stored metadata', sanitizeForServerLog(acc.metadata || {}));
          try {
            const tokenSample = token ? (String(token).slice(0,8) + '...') : null;
            console.log('listAccountVideos: access token present, sample:', tokenSample);
          } catch (tokErr) { /* ignore token sample errors */ }
        } catch (logErr) {}

        // Try to ensure we have a Page access token when pageId is present
        let tokenForPage = token;
        const pageId = acc.metadata && (acc.metadata.page_id || acc.metadata.pageId || (acc.metadata.raw && (acc.metadata.raw.page_id || acc.metadata.raw.pageId))) || null;
        if (hasPageId && pageId) {
          try {
            const got = await ensurePageAccessToken(pageId, token);
            if (got) {
              tokenForPage = got;
            } else {
              console.error('listAccountVideos: No page access token available for page', pageId);
            }
          } catch (e) {
            console.error('listAccountVideos: ensurePageAccessToken error', { pageId, err: e && (e.response?.data || e.message || String(e)) });
          }
        }

        // Optional debug_token to inspect scopes and token type (helps diagnose missing scopes)
        try {
          const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '';
          const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
          if (appId && appSecret) {
            const appToken = `${appId}|${appSecret}`;
            const dbg = await axios.get('https://graph.facebook.com/debug_token', { params: { input_token: tokenForPage || token, access_token: appToken } });
            try { console.log('listAccountVideos: debug_token ->', sanitizeForServerLog(dbg.data)); } catch (e) {}
          } else {
            try { console.warn('listAccountVideos: skipping debug_token - FACEBOOK_APP_ID/SECRET missing'); } catch(e){}
          }
        } catch (dbgErr) {
          try { console.warn('listAccountVideos: debug_token failed', dbgErr && (dbgErr.response?.data || dbgErr.message || String(dbgErr))); } catch (e) {}
        }

        // Fetch profile info using the chosen Graph base
        let profile = { id: igUserId, username: null, media_count: null, raw: acc.metadata || {} };
        try {
          // If we have a page id (IG Business linked via a Facebook Page) prefer fetching the instagram_business_account via the Page node
          const pageId = acc.metadata && (acc.metadata.page_id || acc.metadata.pageId || (acc.metadata.raw && (acc.metadata.raw.page_id || acc.metadata.raw.pageId))) || null;
          if (hasPageId && pageId) {
            try {
              const pageResp = await axios.get(`${graphBase}/${pageId}`, { params: { fields: 'instagram_business_account{username,media_count,id}', access_token: tokenForPage } });
              // pageResp.data.instagram_business_account may contain nested info
              const igFromPage = pageResp.data && pageResp.data.instagram_business_account ? pageResp.data.instagram_business_account : null;
              if (igFromPage) {
                profile.username = igFromPage.username || profile.username;
                profile.media_count = igFromPage.media_count || profile.media_count;
                profile.id = igFromPage.id || profile.id;
                profile.raw = Object.assign(profile.raw || {}, { from_page: pageResp.data });
              } else {
                // Fallback to direct IG node
                const prof = await axios.get(`${graphBase}/${igUserId}`, { params: { fields: 'id,username,profile_picture_url,media_count', access_token: tokenForPage } });
                profile = Object.assign(profile, prof.data || {});
              }
              try { console.log('listAccountVideos: page fetch result (sanitized)', sanitizeForServerLog(pageResp.data)); } catch (e) {}
            } catch (pageErr) {
              console.error('listAccountVideos: page fetch error', { pageId, err: pageErr && (pageErr.response?.data || pageErr.message || String(pageErr)) });
              // fallback to prof normal
              try {
                const prof = await axios.get(`${graphBase}/${igUserId}`, { params: { fields: 'id,username,profile_picture_url,media_count', access_token: tokenForPage } });
                profile = Object.assign(profile, prof.data || {});
              } catch (e) {
                console.error('listAccountVideos: fallback IG fetch error', { igUserId, err: e && (e.response?.data || e.message || String(e)) });
                profile = Object.assign(profile, acc.metadata || {});
              }
            }
          } else {
            const prof = await axios.get(`${graphBase}/${igUserId}`, { params: { fields: 'id,username,profile_picture_url,media_count', access_token: tokenForPage } });
            profile = Object.assign(profile, prof.data || {});
          }
        } catch (e) {
          console.error('listAccountVideos: instagram profile fetch error', { accountId: id, err: e && (e.response?.data || e.message || String(e)) });
          // keep metadata fallback
          profile = Object.assign(profile, acc.metadata || {});
        }

        // Attempt to fetch user-level insights (best-effort). Must request with proper period per metric.
        const userMetrics = {};
        try {
          // 1) day metrics for recent activity. Some metrics (eg. profile_views) require metric_type=total_value
          const dayMetrics = ['reach','profile_views'];
          const insDayResp = await axios.get(`${graphBase}/${igUserId}/insights`, { params: { metric: dayMetrics.join(','), period: 'day', metric_type: 'total_value', access_token: tokenForPage } });
          if (insDayResp && Array.isArray(insDayResp.data?.data)) {
            for (const m of insDayResp.data.data) {
              let latest = null;
              if (Array.isArray(m.values) && m.values.length) latest = m.values[m.values.length-1].value;
              else if (m.total_value && typeof m.total_value.value !== 'undefined') latest = m.total_value.value;
              userMetrics[m.name] = latest;
            }
          }
        } catch (e) {
          console.error('listAccountVideos: insights (day) fetch error', { accountId: id, igUserId, err: e && (e.response?.data || e.message || String(e)) });
        }
        try {
          // 2) follower_count: request as a time_series/day (lifetime has caused incompatibility for some accounts)
          const lifeResp = await axios.get(`${graphBase}/${igUserId}/insights`, { params: { metric: 'follower_count', period: 'day', metric_type: 'time_series', access_token: tokenForPage } });
          if (lifeResp && Array.isArray(lifeResp.data?.data)) {
            for (const m of lifeResp.data.data) {
              let latest = null;
              if (Array.isArray(m.values) && m.values.length) latest = m.values[m.values.length-1].value;
              else if (m.total_value && typeof m.total_value.value !== 'undefined') latest = m.total_value.value;
              userMetrics[m.name] = latest;
            }
          }
        } catch (e) {
          console.error('listAccountVideos: insights (follower_count) fetch error', { accountId: id, igUserId, err: e && (e.response?.data || e.message || String(e)) });
        }

        // Fetch recent media list
        let media = [];
        try {
          const mediaResp = await axios.get(`${graphBase}/${igUserId}/media`, { params: { fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count', access_token: tokenForPage, limit: 50 } });
          const items = mediaResp.data && mediaResp.data.data ? mediaResp.data.data : [];
          // For each media, attempt to fetch media-level insights
          const mapped = await Promise.all(items.map(async (m) => {
            const base = { id: m.id, caption: m.caption || null, media_type: m.media_type || null, media_url: m.media_url || m.thumbnail_url || null, timestamp: m.timestamp || null };
            // Pre-fill with counts present on the media node
            const metrics = { views: null, likes: (m.like_count || null), comments: (m.comments_count || null), saves: null, shares: null };
            try {
              // Use valid media-level metrics: views,likes,comments
              const mm = await axios.get(`${graphBase}/${m.id}/insights`, { params: { metric: 'views,likes,comments', access_token: tokenForPage } });
              if (mm && Array.isArray(mm.data?.data)) {
                for (const it of mm.data.data) {
                  const name = it.name;
                  const latest = Array.isArray(it.values) && it.values.length ? it.values[it.values.length-1].value : null;
                  if (name === 'views') metrics.views = latest;
                  if (name === 'likes') metrics.likes = latest;
                  if (name === 'comments') metrics.comments = latest;
                  if (name === 'saves') metrics.saves = latest;
                  if (name === 'shares') metrics.shares = latest;
                }
              }
            } catch (e) {
              // ignore per-media insights failures
            }
            return Object.assign(base, { metrics });
          }));
          media = mapped;
        } catch (e) {
          // ignore media fetch failure
        }

        // Build the profile-level response mapping to requested keys
        const profileResult = {
          username: profile.username || null,
          ig_user_id: profile.id || igUserId,
          follower_count: userMetrics.follower_count || null,
          profile_views: userMetrics.profile_views || null,
          reach: userMetrics.reach || null,
          online_followers: userMetrics.online_followers || null,
          raw: profile,
        };

        // Persist username / media_count / page_access_token into IntegrationAccount metadata when available
        try {
          let changed = false;
          acc.metadata = acc.metadata || {};
          if (profileResult.username && acc.metadata.username !== profileResult.username) {
            acc.metadata.username = profileResult.username;
            changed = true;
          }
          // prefer the media_count value from the fetched profile if present
          if (typeof profile.media_count !== 'undefined' && profile.media_count !== null && acc.metadata.media_count !== profile.media_count) {
            acc.metadata.media_count = profile.media_count;
            changed = true;
          }
          // persist page token when we resolved one for page-based requests
          if (tokenForPage && acc.metadata.page_access_token !== tokenForPage) {
            acc.metadata.page_access_token = tokenForPage;
            changed = true;
          }
          if (changed) {
            try {
              await acc.save();
              try { console.log('listAccountVideos: updated IntegrationAccount metadata', { accountId: id, metadataSample: sanitizeForServerLog({ username: acc.metadata.username, media_count: acc.metadata.media_count }) }); } catch (e) {}
            } catch (saveErr) {
              console.warn('listAccountVideos: failed to persist instagram metadata', { accountId: id, err: saveErr && (saveErr.message || String(saveErr)) });
            }
          }
        } catch (e) {
          console.warn('listAccountVideos: metadata persistence error', { accountId: id, err: e && (e.message || String(e)) });
        }

        try { console.log('listAccountVideos: returning instagram profile', { accountId: id, ig_user_id: profileResult.ig_user_id, mediaCount: (media || []).length, graphBase }); } catch (e) {}
        return res.json({ profile: profileResult, media });
      } catch (err) {
        console.error('integrations.listAccountVideos: unexpected instagram error', { account: acc._id, err: err && (err.response?.data || err.message || String(err)) });
        try { console.error('listAccountVideos: instagram error', { accountId: id, err: err && (err.response?.data || err.message || String(err)) }); } catch (e) {}
        return res.status(500).json({ error: 'Failed to list instagram media/metrics', details: err && (err.response?.data || err.message || String(err)) });
      }
    }

    // Twitch flow (video listing not implemented here). Return metadata and an empty videos array.
    if (acc.platform === 'twitch') {
      try {
        const token = (typeof getValidAccessToken === 'function') ? await getValidAccessToken(acc) : acc.accessToken;
        if (!token) return res.status(400).json({ error: 'Integration account has no access token. Reconnect the account.' });
        const profile = acc.metadata || null;
        return res.json({ profile, videos: [] });
      } catch (err) {
        console.error('integrations.listAccountVideos: unexpected twitch error', { account: acc._id, err: err && (err.response?.data || err.message || String(err)) });
        return res.status(500).json({ error: 'Failed to list twitch videos', details: err && (err.response?.data || err.message || String(err)) });
      }
    }

    return res.status(400).json({ error: 'Unsupported integration platform' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list videos' });
  }
};

// Diagnostic endpoint: run debug_token, page node, IG node and insights and return raw JSON
exports.diagnoseIntegration = async (req, res) => {
  const { id } = req.params;
  try {
    const acc = await IntegrationAccount.findOne({ _id: id, user: req.user.id });
    if (!acc) return res.status(404).json({ error: 'Integration account not found' });

    const token = (typeof getValidAccessToken === 'function') ? await getValidAccessToken(acc) : acc.accessToken;
    const pageId = acc.metadata && (acc.metadata.page_id || acc.metadata.pageId || (acc.metadata.raw && (acc.metadata.raw.page_id || acc.metadata.raw.pageId))) || null;
    const igUserId = acc.metadata && (acc.metadata.ig_user_id || acc.metadata.user_id || (acc.metadata.raw && (acc.metadata.raw.id || acc.metadata.raw.user_id))) || null;

    const result = { accountId: id, storedMetadata: sanitizeForServerLog(acc.metadata || {}), checks: {} };

    // Ensure page token if applicable
    let tokenForPage = token;
    if (pageId && token) {
      try {
        const got = await ensurePageAccessToken(pageId, token);
        tokenForPage = got || token;
        result.checks.page_access_token_resolved = !!got;
      } catch (e) {
        result.checks.page_access_token_error = String(e && (e.response?.data || e.message || e));
      }
    }

    // debug_token
    try {
      const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '';
      const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
      if (appId && appSecret) {
        const appToken = `${appId}|${appSecret}`;
        const dbg = await axios.get('https://graph.facebook.com/debug_token', { params: { input_token: tokenForPage || token, access_token: appToken } });
        result.checks.debug_token = sanitizeForServerLog(dbg.data);
      } else {
        result.checks.debug_token = { skipped: 'FACEBOOK_APP_ID/SECRET missing' };
      }
    } catch (e) {
      result.checks.debug_token = { error: e && (e.response?.data || e.message || String(e)) };
    }

    // Page node
    if (pageId) {
      try {
        const pageResp = await axios.get(`https://graph.facebook.com/v16.0/${pageId}`, { params: { fields: 'instagram_business_account{username,media_count,id}', access_token: tokenForPage } });
        result.checks.page = sanitizeForServerLog(pageResp.data);
      } catch (e) {
        result.checks.page = { error: e && (e.response?.data || e.message || String(e)) };
      }
    }

    // IG node
    if (igUserId) {
      try {
        const igResp = await axios.get(`https://graph.facebook.com/v16.0/${igUserId}`, { params: { fields: 'id,username,profile_picture_url,media_count', access_token: tokenForPage } });
        result.checks.ig = sanitizeForServerLog(igResp.data);
      } catch (e) {
        result.checks.ig = { error: e && (e.response?.data || e.message || String(e)) };
      }

      // Insights: day metrics and follower_count
      try {
        const dayMetrics = ['reach','profile_views'];
        const insDayResp = await axios.get(`https://graph.facebook.com/v16.0/${igUserId}/insights`, { params: { metric: dayMetrics.join(','), period: 'day', metric_type: 'total_value', access_token: tokenForPage } });
        result.checks.insights_day = sanitizeForServerLog(insDayResp.data || {});
      } catch (e) {
        result.checks.insights_day = { error: e && (e.response?.data || e.message || String(e)) };
      }
      try {
        const insFollower = await axios.get(`https://graph.facebook.com/v16.0/${igUserId}/insights`, { params: { metric: 'follower_count', period: 'day', metric_type: 'time_series', access_token: tokenForPage } });
        result.checks.insights_follower = sanitizeForServerLog(insFollower.data || {});
      } catch (e) {
        result.checks.insights_follower = { error: e && (e.response?.data || e.message || String(e)) };
      }
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'diagnose failed', details: err && (err.response?.data || err.message || String(err)) });
  }
};
