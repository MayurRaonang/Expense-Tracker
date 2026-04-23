const { pool } = require('../config/db');
const alertService = require('./alertService');

/**
 * Maps a DB row + computed spend to BudgetAlertDto.BudgetResponse shape.
 * Mirrors BudgetService.toResponse() in Java.
 */
const toResponse = (row, spent) => {
  const monthlyLimit = parseFloat(row.monthly_limit);
  const spentNum = parseFloat(spent);
  const percentUsed = monthlyLimit > 0
    ? Math.round((spentNum / monthlyLimit) * 1000) / 10  // 1 decimal place
    : 0;

  return {
    id: row.id,
    category: row.category,
    monthlyLimit: row.monthly_limit,
    spent: spentNum.toFixed(2),
    percentUsed,
    month: row.month,
    year: row.year,
  };
};

/**
 * Calculates how much was spent in a category for the given month/year.
 * Mirrors BudgetService.calculateSpent() in Java.
 */
const calculateSpent = async (userId, category, month, year) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1
       AND category = $2
       AND EXTRACT(MONTH FROM transaction_date) = $3
       AND EXTRACT(YEAR  FROM transaction_date) = $4`,
    [userId, category, month, year]
  );
  return parseFloat(rows[0].total);
};

/**
 * Upsert — update if exists, create if not.
 * Mirrors BudgetService.createOrUpdate() in Java.
 */
const createOrUpdate = async (request, user) => {
  const { rows } = await pool.query(
    `INSERT INTO budgets (user_id, category, monthly_limit, month, year)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, category, month, year)
     DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
     RETURNING *`,
    [user.id, request.category, request.monthlyLimit, request.month, request.year]
  );
  const budget = rows[0];
  const spent = await calculateSpent(user.id, budget.category, budget.month, budget.year);
  return toResponse(budget, spent);
};

const getBudgetsForMonth = async (userId, month, year) => {
  const { rows } = await pool.query(
    `SELECT * FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3`,
    [userId, month, year]
  );
  return Promise.all(
    rows.map(async (b) => {
      const spent = await calculateSpent(userId, b.category, b.month, b.year);
      return toResponse(b, spent);
    })
  );
};

const getAllBudgets = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM budgets WHERE user_id = $1`,
    [userId]
  );
  return Promise.all(
    rows.map(async (b) => {
      const spent = await calculateSpent(userId, b.category, b.month, b.year);
      return toResponse(b, spent);
    })
  );
};

const deleteBudget = async (id, userId) => {
  const { rows } = await pool.query(`SELECT * FROM budgets WHERE id = $1`, [id]);
  if (rows.length === 0) throw new Error('Budget not found');
  if (rows[0].user_id !== userId) throw new Error('Access denied');
  await pool.query(`DELETE FROM budgets WHERE id = $1`, [id]);
};

module.exports = { createOrUpdate, getBudgetsForMonth, getAllBudgets, deleteBudget };
