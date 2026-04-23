const { pool } = require('../config/db');

/**
 * Maps a DB row to the AlertResponse DTO shape.
 * Mirrors AlertService.toResponse() in Java.
 */
const toResponse = (row) => ({
  id: row.id,
  alertType: row.alert_type,
  message: row.message,
  isRead: row.is_read,
  transactionId: row.transaction_id || null,
  createdAt: row.created_at,
});

const createAnomalyAlert = async (user, transaction) => {
  const message = `Unusual transaction detected: ${user.currency} ${transaction.amount} at ${transaction.merchant}. This is significantly higher than your usual spending in this category.`;
  await pool.query(
    `INSERT INTO alerts (user_id, transaction_id, alert_type, message, is_read)
     VALUES ($1, $2, 'ANOMALY', $3, FALSE)`,
    [user.id, transaction.id, message]
  );
};

const createBudgetWarningAlert = async (userId, category, percentUsed) => {
  const message = `Budget warning: You have used ${Math.round(percentUsed)}% of your ${category} budget for this month.`;
  await pool.query(
    `INSERT INTO alerts (user_id, alert_type, message, is_read)
     VALUES ($1, 'BUDGET_WARNING', $2, FALSE)`,
    [userId, message]
  );
};

const createBudgetExceededAlert = async (userId, category) => {
  const message = `Budget exceeded: Your spending in ${category} has gone over your monthly limit.`;
  await pool.query(
    `INSERT INTO alerts (user_id, alert_type, message, is_read)
     VALUES ($1, 'BUDGET_EXCEEDED', $2, FALSE)`,
    [userId, message]
  );
};

const getAlertsForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(toResponse);
};

const getUnreadAlertsForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(toResponse);
};

const getUnreadCount = async (userId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
};

const markAsRead = async (alertId, userId) => {
  await pool.query(
    `UPDATE alerts SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [alertId, userId]
  );
};

const markAllAsRead = async (userId) => {
  await pool.query(
    `UPDATE alerts SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
};

module.exports = {
  createAnomalyAlert,
  createBudgetWarningAlert,
  createBudgetExceededAlert,
  getAlertsForUser,
  getUnreadAlertsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
