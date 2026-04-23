const express = require('express');
const { body } = require('express-validator');
const budgetService = require('../services/budgetService');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/budgets
router.post(
  '/',
  [
    body('category').notEmpty(),
    body('monthlyLimit').isFloat({ min: 1.0 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2020 }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await budgetService.createOrUpdate(req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/budgets?month=&year=
router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (month !== undefined && year !== undefined) {
      return res.json(await budgetService.getBudgetsForMonth(req.user.id, parseInt(month), parseInt(year)));
    }
    res.json(await budgetService.getAllBudgets(req.user.id));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await budgetService.deleteBudget(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
