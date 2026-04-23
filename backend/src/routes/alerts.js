const express = require('express');
const alertService = require('../services/alertService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/alerts?unreadOnly=true
router.get('/', async (req, res, next) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = unreadOnly
      ? await alertService.getUnreadAlertsForUser(req.user.id)
      : await alertService.getAlertsForUser(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/count
router.get('/count', async (req, res, next) => {
  try {
    const count = await alertService.getUnreadCount(req.user.id);
    res.json({ unread: count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    await alertService.markAsRead(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/alerts/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await alertService.markAllAsRead(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
