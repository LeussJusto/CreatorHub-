// TikTok service removed — provider replaced by Twitch in this project.
// Previously this file contained logic for the TikTok Business/Open APIs.
// Kept as a stub to avoid runtime import errors until all references are cleaned.

module.exports = {
  async getUserProfile() {
    return { id: null, displayName: 'TikTok (removed)', avatar: null, stats: {}, raw: {} };
  },
  async listVideos() {
    return [];
  },
};
