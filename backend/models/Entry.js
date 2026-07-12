const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  contentType: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentType', required: true, index: true },
  contentTypeSlug: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft','published','archived'], default: 'draft', index: true },
  locale: { type: String, default: 'en' },
  publishedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
}, { timestamps: true });

entrySchema.index({ contentTypeSlug: 1, status: 1, createdAt: -1 });
entrySchema.pre('save', function(next) {
  if (!this.isNew) this.version += 1;
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  next();
});
module.exports = mongoose.model('Entry', entrySchema);
