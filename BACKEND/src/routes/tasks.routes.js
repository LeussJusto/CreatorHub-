const router = require('express').Router();
const { body, param } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { createTask, listTasks, updateTask, deleteTask, toggleChecklist } = require('../controllers/tasks.controller');
const validate = require('../middleware/validate');

router.use(authRequired);

router.post('/', [
  body('projectId').isMongoId(),
  body('title').isString().notEmpty(),
], validate, createTask);

router.get('/:projectId', [
  param('projectId').isMongoId(),
], validate, listTasks);

router.put('/:taskId', [
  param('taskId').isMongoId(),
], validate, updateTask);

router.delete('/:taskId', [
  param('taskId').isMongoId(),
], validate, deleteTask);

router.patch('/:taskId/checklist', [
  param('taskId').isMongoId(),
  body('index').isInt({ min: 0 }),
  body('completed').isBoolean(),
], validate, toggleChecklist);

module.exports = router;
