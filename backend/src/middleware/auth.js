const { verifyToken, extractUsername } = require('../config/jwt');
const { pool } = require('../config/db');

/**
 * JWT authentication middleware.
 * Mirrors JwtAuthFilter.java — reads Bearer token from Authorization header,
 * validates it, loads the user from DB, and attaches to req.user.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Skip if no Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    const email = payload.sub;

    if (!email) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        status: 401,
        message: 'Invalid token',
      });
    }

    const { rows } = await pool.query(
      'SELECT id, email, full_name, currency, created_at FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        status: 401,
        message: 'User not found',
      });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = { authenticate };
