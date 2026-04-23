const express = require('express');
const { body } = require('express-validator');
const authService = require('../services/authService');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('fullName is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
