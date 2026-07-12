const ApiKey = require('../models/ApiKey');
const apiResponse = require('../utils/apiResponse');

exports.create = async (req, res) => {
  try {
    const key = ApiKey.generateKey();
    const apiKey = await ApiKey.create({
      name: req.body.name, key, keyPreview: key.slice(-8),
      permissions: req.body.permissions || { read: true, write: false },
      allowedContentTypes: req.body.allowedContentTypes || [],
      expiresAt: req.body.expiresAt || null,
      createdBy: req.user._id,
    });
    apiResponse.created(res, {
      apiKey: { _id: apiKey._id, name: apiKey.name, key, keyPreview: apiKey.keyPreview, permissions: apiKey.permissions, allowedContentTypes: apiKey.allowedContentTypes, expiresAt: apiKey.expiresAt, createdAt: apiKey.createdAt }
    }, 'API key created. Save it now — it will not be shown again.');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.getAll = async (req, res) => {
  try {
    const keys = await ApiKey.find({ createdBy: req.user._id }).sort('-createdAt');
    apiResponse.success(res, { apiKeys: keys });
  } catch { apiResponse.error(res); }
};

exports.revoke = async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!key) return apiResponse.notFound(res, 'API key not found');
    apiResponse.success(res, {}, 'API key revoked');
  } catch { apiResponse.error(res); }
};

exports.delete = async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) return apiResponse.notFound(res, 'API key not found');
    apiResponse.success(res, {}, 'API key deleted');
  } catch { apiResponse.error(res); }
};
