const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authRequired } = require('../middleware/auth');
const { createProject, getMyProjects, inviteMember, acceptInvitation, setLeader, getProjectById, updateProject, deleteProject } = require('../controllers/projects.controller');

router.use(authRequired);

router.post('/', [
  body('name').isString().notEmpty(),
], validate, createProject);

router.get('/mine', getMyProjects);

router.get('/:projectId', [
  param('projectId').isMongoId(),
], validate, getProjectById);

router.put('/:projectId', [
  param('projectId').isMongoId(),
  body('name').optional().isString(),
  body('description').optional().isString(),
], validate, updateProject);

router.delete('/:projectId', [
  param('projectId').isMongoId(),
], validate, deleteProject);

router.post('/:projectId/invitations', [
  param('projectId').isMongoId(),
  body('email').isEmail(),
], validate, inviteMember);

router.post('/:projectId/invitations/accept', [
  param('projectId').isMongoId(),
  body('token').isString().notEmpty(),
], validate, acceptInvitation);

router.patch('/:projectId/leader', [
  param('projectId').isMongoId(),
  body('memberId').isMongoId(),
  body('isLeader').isBoolean(),
], validate, setLeader);

module.exports = router;
