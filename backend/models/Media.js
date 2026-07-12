const mongoose = require('mongoose');
const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  path: { type: String, required: true },
  alt: { type: String, default: '' },
  caption: { type: String, default: '' },
  width: Number, height: Number,
  folder: { type: String, default: 'general' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Media', mediaSchema);
