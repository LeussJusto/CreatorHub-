const router = require('express').Router();
const { body } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { connectAccount, listAccounts, oauthYoutubeStart, oauthYoutubeCallback } = require('../controllers/integrations.controller');
// Callback must be reachable by the OAuth provider (Google) without requiring the user's
// Authorization header, because Google will redirect the browser to this URL.
router.get('/oauth/youtube/callback', oauthYoutubeCallback);

router.use(authRequired);

// Start the OAuth flow (user must be authenticated in our app)
router.get('/oauth/youtube/start', oauthYoutubeStart);

// (metrics fetching moved to analytics routes/controller)

router.post('/connect', [
  body('platform').isIn(['instagram', 'tiktok', 'youtube']),
  body('accessToken').isString().notEmpty(),
], connectAccount);

router.get('/accounts', listAccounts);

// List videos for a specific integration account (e.g. YouTube channel)
router.get('/accounts/:id/videos', require('../controllers/integrations.controller').listAccountVideos);

module.exports = router;
