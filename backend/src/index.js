require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/db');

const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes      = require('./routes/budgets');
const alertRoutes       = require('./routes/alerts');

const app = express();

// ── CORS — mirrors SecurityConfig.corsConfigurationSource() ──────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl / Postman) or from allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
  })
  
);

app.use(express.json());

// ── Health check — mirrors /actuator/health (public) ─────────────────────────
app.get('/actuator/health', (_req, res) => res.json({ status: 'UP' }));
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── Routes — mirrors @RequestMapping on controllers ──────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets',      budgetRoutes);
app.use('/api/alerts',       alertRoutes);

// ── Global error handler — mirrors GlobalExceptionHandler.java ───────────────
app.use((err, _req, res, _next) => {
  console.error(err.message);

  // Invalid credentials from AuthService
  if (err.message === 'INVALID_CREDENTIALS') {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      message: 'Invalid email or password',
    });
  }

  // Access denied / not found — map to 400 like Java RuntimeException handler
  return res.status(400).json({
    timestamp: new Date().toISOString(),
    status: 400,
    message: err.message || 'An unexpected error occurred',
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Expense Tracker backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
