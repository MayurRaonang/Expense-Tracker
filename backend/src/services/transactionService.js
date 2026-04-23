const { pool } = require('../config/db');
const mlService = require('./mlService');
const alertService = require('./alertService');

// Anomaly threshold: scores below this trigger a flag
const ANOMALY_THRESHOLD = -0.1;

/**
 * Maps a DB row to the TransactionDto.Response shape.
 * Mirrors TransactionService.toResponse() in Java.
 */
const toResponse = (row) => ({
  id: row.id,
  merchant: row.merchant,
  amount: row.amount,
  category: row.category,
  autoCategory: row.auto_category,
  anomalyScore: row.anomaly_score !== null ? parseFloat(row.anomaly_score) : null,
  isFlagged: row.is_flagged,
  transactionDate: row.transaction_date,
  notes: row.notes,
  createdAt: row.created_at,
});

/**
 * Creates a transaction, runs ML auto-categorisation + anomaly detection,
 * and fires alerts when needed.
 */
const create = async (request, user) => {
  // 1. ML: auto-categorise if category not provided
  let category = request.category;
  let autoCategory = await mlService.getAutoCategory(request.merchant);

  if (!category || category.trim() === '') {
    category = autoCategory;
    console.info(`Auto-categorised '${request.merchant}' as '${autoCategory}'`);
  }

  // 2. ML: anomaly detection using user's transaction history
  const { rows: historyRows } = await pool.query(
    `SELECT amount::DOUBLE PRECISION FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC`,
    [user.id]
  );
  const userHistory = historyRows.map((r) => parseFloat(r.amount));

  const { anomalyScore, isAnomaly } = await mlService.getAnomalyScore(
  request.amount,
  category,
  userHistory
);

const isFlagged = isAnomaly;
  // 4. Persist
  const { rows } = await pool.query(
    `INSERT INTO transactions
       (user_id, merchant, amount, category, auto_category, anomaly_score, is_flagged, transaction_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      user.id,
      request.merchant,
      request.amount,
      category,
      autoCategory,
      anomalyScore,
      isFlagged,
      request.transactionDate,
      request.notes || null,
    ]
  );

  const saved = rows[0];

  // 5. Create anomaly alert if flagged
  if (isFlagged) {
    await alertService.createAnomalyAlert(user, saved);
    console.info(`Anomaly flagged for transaction ${saved.id} (score: ${anomalyScore})`);
  }

  return toResponse(saved);
};

const getAllForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC`,
    [userId]
  );
  return rows.map(toResponse);
};

const getByCategory = async (userId, category) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 AND category = $2 ORDER BY transaction_date DESC`,
    [userId, category]
  );
  return rows.map(toResponse);
};

const getByDateRange = async (userId, startDate, endDate) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions
     WHERE user_id = $1 AND transaction_date BETWEEN $2 AND $3
     ORDER BY transaction_date DESC`,
    [userId, startDate, endDate]
  );
  return rows.map(toResponse);
};

const getFlaggedTransactions = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE user_id = $1 AND is_flagged = TRUE ORDER BY transaction_date DESC`,
    [userId]
  );
  return rows.map(toResponse);
};

const getById = async (id, userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) throw new Error('Transaction not found');
  if (rows[0].user_id !== userId) throw new Error('Access denied');
  return toResponse(rows[0]);
};

const update = async (id, request, userId) => {
  // Fetch existing to verify ownership
  const { rows: existing } = await pool.query(
    `SELECT * FROM transactions WHERE id = $1`,
    [id]
  );
  if (existing.length === 0) throw new Error('Transaction not found');
  if (existing[0].user_id !== userId) throw new Error('Access denied');

  const current = existing[0];

  const { rows } = await pool.query(
    `UPDATE transactions SET
       merchant        = COALESCE($1, merchant),
       amount          = COALESCE($2, amount),
       category        = COALESCE($3, category),
       transaction_date = COALESCE($4, transaction_date),
       notes           = COALESCE($5, notes)
     WHERE id = $6
     RETURNING *`,
    [
      request.merchant   !== undefined ? request.merchant   : null,
      request.amount     !== undefined ? request.amount     : null,
      request.category   !== undefined ? request.category   : null,
      request.transactionDate !== undefined ? request.transactionDate : null,
      request.notes      !== undefined ? request.notes      : current.notes,
      id,
    ]
  );

  return toResponse(rows[0]);
};

const deleteTransaction = async (id, userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) throw new Error('Transaction not found');
  if (rows[0].user_id !== userId) throw new Error('Access denied');
  await pool.query(`DELETE FROM transactions WHERE id = $1`, [id]);
};

module.exports = {
  create,
  getAllForUser,
  getByCategory,
  getByDateRange,
  getFlaggedTransactions,
  getById,
  update,
  deleteTransaction,
};
