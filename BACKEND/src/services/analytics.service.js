const IntegrationAccount = require('../models/IntegrationAccount');

module.exports = {
  async getProjectOverview(projectId, userId) {
    // Placeholder combining metrics from multiple platforms.
    const accounts = await IntegrationAccount.find({ user: userId });
    return {
      projectId,
      connectedPlatforms: accounts.map(a => a.platform),
      metrics: {
        instagram: { followers: null, likes: null },
        tiktok: { followers: null, likes: null },
        youtube: { subscribers: null, views: null },
      },
    };
  },
};
