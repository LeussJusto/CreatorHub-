const axios = require('axios');

module.exports = {
  async getBusinessProfile(accessToken) {
    // Placeholder for TikTok Business API
    const url = 'https://business-api.tiktok.com/open_api/v1.3/user/info/';
    const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return data;
  },
};
