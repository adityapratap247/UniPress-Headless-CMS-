require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const port = process.env.PORT || 8000;

const connectDB = require('./config/database');
const routes = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
connectDB();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    if (!origin || allowed.includes(origin) || process.env.NODE_ENV === 'development') callback(null, true);
    else callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-API-Key'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts' } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) }, skip: (req) => req.url === '/api/health' }));
}

// Static files (uploaded media)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString(), db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', env: process.env.NODE_ENV });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => logger.info(`🚀 CMS API running on port ${PORT} [${process.env.NODE_ENV}]`));

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    require('mongoose').connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => { logger.error(`Unhandled Rejection: ${err.message}`); shutdown('UnhandledRejection'); });

module.exports = app;
