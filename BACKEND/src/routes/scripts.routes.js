const router = require('express').Router();
const { body, param } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { createScript, addVersion, comment, setStatus } = require('../controllers/scripts.controller');
const validate = require('../middleware/validate');

router.use(authRequired);

router.post('/', [
  body('projectId').isMongoId(),
  body('title').isString().notEmpty(),
  body('content').isString().notEmpty(),
], validate, createScript);

router.post('/:scriptId/versions', [
  param('scriptId').isMongoId(),
  body('content').isString().notEmpty(),
], validate, addVersion);

router.post('/:scriptId/comments', [
  param('scriptId').isMongoId(),
  body('sectionId').isString().notEmpty(),
  body('text').isString().notEmpty(),
], validate, comment);

router.patch('/:scriptId/status', [
  param('scriptId').isMongoId(),
  body('status').isIn(['draft', 'in_review', 'approved']),
], validate, setStatus);

module.exports = router;
