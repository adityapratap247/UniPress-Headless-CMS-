const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
    if (!token) return apiResponse.unauthorized(res, 'Please log in to access this resource');
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch (err) {
      if (err.name === 'TokenExpiredError') return apiResponse.unauthorized(res, 'Token expired');
      return apiResponse.unauthorized(res, 'Invalid token');
    }
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user || !user.isActive) return apiResponse.unauthorized(res, 'User not found or deactivated');
    if (user.changedPasswordAfter(decoded.iat)) return apiResponse.unauthorized(res, 'Password changed. Please log in again');
    req.user = user;
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    apiResponse.error(res, 'Authentication failed');
  }
};

const apiKeyAuth = async (req, res, next) => {
  try {
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (!key) return apiResponse.unauthorized(res, 'API key required');
    const apiKey = await ApiKey.findOne({ key, isActive: true }).select('+key');
    if (!apiKey) return apiResponse.unauthorized(res, 'Invalid or inactive API key');
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return apiResponse.unauthorized(res, 'API key expired');
    ApiKey.updateOne({ _id: apiKey._id }, { lastUsed: new Date(), $inc: { usageCount: 1 } }).exec();
    req.apiKey = apiKey;
    next();
  } catch (err) {
    apiResponse.error(res, 'Authentication failed');
  }
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return apiResponse.forbidden(res, 'You do not have permission');
  next();
};

module.exports = { protect, apiKeyAuth, restrictTo };
