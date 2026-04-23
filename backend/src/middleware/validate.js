const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains.
 * Mirrors GlobalExceptionHandler.handleValidationErrors in Java.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = {};
    errors.array().forEach((e) => {
      fieldErrors[e.path] = e.msg;
    });
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      errors: fieldErrors,
    });
  }
  next();
};

module.exports = { handleValidation };
