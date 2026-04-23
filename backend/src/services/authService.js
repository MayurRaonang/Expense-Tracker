const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../config/jwt');

/**
 * Register a new user.
 * Mirrors AuthService.register() in Java.
 */
const register = async (request) => {
  const { email, password, fullName, currency = 'INR' } = request;

  // Check if email already exists
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existing.length > 0) {
    throw new Error('Email already registered');
  }

  const hashed = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password, full_name, currency)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, currency`,
    [email, hashed, fullName, currency]
  );

  const user = rows[0];
  const token = generateToken(user);

  return {
    token,
    email: user.email,
    fullName: user.full_name,
    currency: user.currency,
  };
};

/**
 * Login an existing user.
 * Mirrors AuthService.login() in Java.
 */
const login = async (request) => {
  const { email, password } = request;

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (rows.length === 0) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const user = rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = generateToken(user);

  return {
    token,
    email: user.email,
    fullName: user.full_name,
    currency: user.currency,
  };
};

module.exports = { register, login };
