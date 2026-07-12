const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['superadmin', 'admin', 'editor', 'viewer'], default: 'editor' },
  isActive: { type: Boolean, default: true },
  avatar: { type: String, default: null },
  lastLogin: { type: Date, default: null },
  refreshTokens: [{ type: String, select: false }],
  passwordChangedAt: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = async function(p) { return bcrypt.compare(p, this.password); };
userSchema.methods.changedPasswordAfter = function(ts) {
  if (this.passwordChangedAt) return ts < parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  return false;
};
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password; delete obj.refreshTokens; delete obj.passwordChangedAt;
  return obj;
};
module.exports = mongoose.model('User', userSchema);
