const express = require('express');
const { body } = require('express-validator');
const transactionService = require('../services/transactionService');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/transactions
router.post(
  '/',
  [
    body('merchant').notEmpty().withMessage('Merchant is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('transactionDate').notEmpty().withMessage('Transaction date is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await transactionService.create(req.body, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/transactions/flagged  — must come BEFORE /:id to avoid route clash
router.get('/flagged', async (req, res, next) => {
  try {
    const result = await transactionService.getFlaggedTransactions(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions?category=...&startDate=...&endDate=...
router.get('/', async (req, res, next) => {
  try {
    const { category, startDate, endDate } = req.query;

    if (category && category.trim() !== '') {
      return res.json(await transactionService.getByCategory(req.user.id, category));
    }
    if (startDate && endDate) {
      return res.json(await transactionService.getByDateRange(req.user.id, startDate, endDate));
    }
    res.json(await transactionService.getAllForUser(req.user.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await transactionService.getById(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const result = await transactionService.update(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
