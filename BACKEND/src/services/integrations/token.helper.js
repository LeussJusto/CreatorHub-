const axios = require('axios');
const IntegrationAccount = require('../../models/IntegrationAccount');

async function refreshAccessToken(account) {
  if (!account) throw new Error('Account required');

  // Instagram long-lived token refresh
  if (String(account.platform).toLowerCase() === 'instagram') {
    if (!account.accessToken) throw new Error('No access token to refresh');
    try {
      const resp = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: account.accessToken,
        }
      });
      const { access_token, expires_in } = resp.data || {};
      if (access_token) account.accessToken = access_token;
      if (expires_in) account.expiresAt = new Date(Date.now() + expires_in * 1000);
      await account.save();
      return account.accessToken;
    } catch (err) {
      throw new Error('Instagram token refresh failed: ' + (err && err.message));
    }
  }

  // Fallback: YouTube refresh (existing behavior)
  if (!account.refreshToken) throw new Error('No refresh token available');

  const params = new URLSearchParams({
    client_id: process.env.YT_CLIENT_ID,
    client_secret: process.env.YT_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  }).toString();

  const resp = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const { access_token, expires_in } = resp.data;
  account.accessToken = access_token;
  if (expires_in) account.expiresAt = new Date(Date.now() + expires_in * 1000);
  await account.save();
  return access_token;
}

async function getValidAccessToken(account) {
  // account is a Mongoose document
  if (!account) throw new Error('IntegrationAccount required');
  // If we have a non-expired token, return it
  if (account.accessToken && account.expiresAt && new Date(account.expiresAt) > new Date(Date.now() + 30000)) {
    return account.accessToken;
  }

  // Token appears expired or near-expiry. Try provider-specific refresh methods.
  try {
    // Instagram: refresh long-lived token using IG refresh endpoint
    if (String(account.platform).toLowerCase() === 'instagram') {
      return await refreshAccessToken(account);
    }

    // YouTube and others using refreshToken
    if (account.refreshToken) return await refreshAccessToken(account);

    // Fallback: return the stored accessToken (may be usable even if no expiry was set)
    if (account.accessToken) return account.accessToken;
  } catch (err) {
    // If refresh failed, fall back to existing stored token if any
    if (account.accessToken) return account.accessToken;
    throw err;
  }

  // Nothing we can do to obtain a token
  throw new Error('No access token available');
}

module.exports = { refreshAccessToken, getValidAccessToken };
