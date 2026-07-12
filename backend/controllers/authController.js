const jwt = require('jsonwebtoken');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
const signRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

const sendTokens = async (user, res, statusCode = 200, message = 'Success') => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken }, lastLogin: new Date() });
  return apiResponse.success(res, { user: user.toSafeObject(), token, refreshToken, expiresIn: process.env.JWT_EXPIRES_IN }, message, statusCode);
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return apiResponse.unauthorized(res, 'Invalid email or password');
    if (!user.isActive) return apiResponse.unauthorized(res, 'Account deactivated');
    logger.info(`User login: ${email}`);
    await sendTokens(user, res, 200, 'Login successful');
  } catch (err) { logger.error(err.message); apiResponse.error(res); }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return apiResponse.badRequest(res, 'Refresh token required');
    let decoded;
    try { decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); }
    catch { return apiResponse.unauthorized(res, 'Invalid or expired refresh token'); }
    const user = await User.findOne({ _id: decoded.id }).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) return apiResponse.unauthorized(res, 'Token invalid');
    await User.findByIdAndUpdate(user._id, { $pull: { refreshTokens: refreshToken } });
    await sendTokens(user, res, 200, 'Token refreshed');
  } catch (err) { apiResponse.error(res); }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: refreshToken } });
    apiResponse.success(res, {}, 'Logged out successfully');
  } catch { apiResponse.error(res); }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  apiResponse.success(res, { user: user.toSafeObject() });
};

exports.updateMe = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { name: req.body.name, avatar: req.body.avatar }, { new: true, runValidators: true });
    apiResponse.success(res, { user: user.toSafeObject() }, 'Profile updated');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) return apiResponse.badRequest(res, 'Current password is incorrect');
    user.password = req.body.newPassword;
    await user.save();
    await User.findByIdAndUpdate(user._id, { refreshTokens: [] });
    apiResponse.success(res, {}, 'Password changed. Please log in again.');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    apiResponse.created(res, { user: user.toSafeObject() }, 'User created');
  } catch (err) {
    if (err.code === 11000) return apiResponse.badRequest(res, 'Email already exists');
    apiResponse.error(res, err.message);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    apiResponse.success(res, { users: users.map(u => u.toSafeObject()), total: users.length });
  } catch { apiResponse.error(res); }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { name: req.body.name, role: req.body.role, isActive: req.body.isActive }, { new: true, runValidators: true });
    if (!user) return apiResponse.notFound(res, 'User not found');
    apiResponse.success(res, { user: user.toSafeObject() }, 'User updated');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return apiResponse.badRequest(res, 'Cannot delete your own account');
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return apiResponse.notFound(res, 'User not found');
    apiResponse.success(res, {}, 'User deleted');
  } catch { apiResponse.error(res); }
};
