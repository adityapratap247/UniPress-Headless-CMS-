const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  let message = err.message || 'Internal server error';
  let statusCode = err.statusCode || 500;
  if (err.code === 11000) { const field = Object.keys(err.keyValue)[0]; message = `${field} already exists`; statusCode = 400; }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return apiResponse.badRequest(res, 'Validation failed', errors);
  }
  if (err.name === 'CastError') { message = `Invalid ${err.path}`; statusCode = 400; }
  if (process.env.NODE_ENV === 'production' && statusCode === 500) { message = 'Something went wrong'; }
  logger.error(`[${req.method}] ${req.path} - ${err.message}`);
  return apiResponse.error(res, message, statusCode);
};

const notFound = (req, res) => apiResponse.notFound(res, `Route ${req.originalUrl} not found`);
module.exports = { errorHandler, notFound };
