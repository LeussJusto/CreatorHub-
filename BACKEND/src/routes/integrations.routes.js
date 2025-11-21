const router = require('express').Router();
const { body } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { connectAccount, listAccounts, oauthYoutubeStart, oauthYoutubeCallback, oauthTwitchStart, oauthTwitchCallback, oauthInstagramStart, oauthInstagramCallback, oauthTikTokStart, oauthTikTokCallback, oauthFacebookStart, oauthFacebookCallback, diagnoseIntegration } = require('../controllers/integrations.controller');
// Callback must be reachable by the OAuth provider (Google) without requiring the user's
// Authorization header, because Google will redirect the browser to this URL.
router.get('/oauth/youtube/callback', oauthYoutubeCallback);
router.get('/oauth/twitch/callback', oauthTwitchCallback);
router.get('/oauth/instagram/callback', oauthInstagramCallback);
router.get('/oauth/tiktok/callback', oauthTikTokCallback);
router.get('/oauth/facebook/callback', oauthFacebookCallback);

router.use(authRequired);

// Start the OAuth flow (user must be authenticated in our app)
router.get('/oauth/youtube/start', oauthYoutubeStart);
router.get('/oauth/twitch/start', oauthTwitchStart);
router.get('/oauth/instagram/start', oauthInstagramStart);
router.get('/oauth/tiktok/start', oauthTikTokStart);
router.get('/oauth/facebook/start', oauthFacebookStart);

// (metrics fetching moved to analytics routes/controller)

router.post('/connect', [
  body('platform').isIn(['twitch', 'youtube', 'instagram', 'tiktok', 'facebook']),
  body('accessToken').isString().notEmpty(),
], connectAccount);

router.get('/accounts', listAccounts);

// List videos for a specific integration account (e.g. YouTube channel)
router.get('/accounts/:id/videos', require('../controllers/integrations.controller').listAccountVideos);
// Diagnostic endpoint to help debug IG tokens/insights
router.get('/accounts/:id/diagnose', diagnoseIntegration);

module.exports = router;
