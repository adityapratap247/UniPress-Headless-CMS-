const mongoose = require('mongoose');
const crypto = require('crypto');
const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, unique: true, select: false },
  keyPreview: String,
  permissions: { read: { type: Boolean, default: true }, write: { type: Boolean, default: false } },
  allowedContentTypes: [String],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  lastUsed: { type: Date, default: null },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
apiKeySchema.statics.generateKey = () => `cms_${crypto.randomBytes(32).toString('hex')}`;
module.exports = mongoose.model('ApiKey', apiKeySchema);
