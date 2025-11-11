const axios = require('axios');
const IntegrationAccount = require('../../models/IntegrationAccount');

async function refreshAccessToken(account) {
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
  if (account.accessToken && account.expiresAt && new Date(account.expiresAt) > new Date(Date.now() + 30000)) {
    return account.accessToken;
  }
  // try to refresh
  return refreshAccessToken(account);
}

module.exports = { refreshAccessToken, getValidAccessToken };
