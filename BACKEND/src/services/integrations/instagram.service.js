const axios = require('axios');

module.exports = {
  async getBasicProfile(accessToken) {
    // Placeholder for Instagram Basic Display API
    const url = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`;
    const { data } = await axios.get(url);
    return data;
  },
};
