const jwt = require('jsonwebtoken');
require('dotenv').config();
const SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
const EXPIRATION_MS = parseInt(process.env.JWT_EXPIRATION_MS || '86400000');

/**
 * Generate a JWT token for the given user.
 * @param {Object} user - must have email field (the "username")
 */
const generateToken = (user) => {
  return jwt.sign(
    { sub: user.email },
    SECRET,
    { expiresIn: Math.floor(EXPIRATION_MS / 1000) } // jwt expects seconds
  );
};

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload or throws on invalid/expired.
 */
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

/**
 * Extract the username (email) from a token without verifying.
 * Use only after verifyToken has confirmed the token is valid.
 */
const extractUsername = (token) => {
  const decoded = jwt.decode(token);
  return decoded ? decoded.sub : null;
};

module.exports = { generateToken, verifyToken, extractUsername };
