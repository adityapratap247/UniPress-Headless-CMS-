const mongoose = require('mongoose');
const slugify = require('slugify');

const FIELD_TYPES = ['text','textarea','richtext','number','boolean','date','media','relation','json','email','url','select','tags'];

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, match: [/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid field name'] },
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: FIELD_TYPES, required: true },
  required: { type: Boolean, default: false },
  unique: { type: Boolean, default: false },
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
  placeholder: { type: String, default: '' },
  description: { type: String, default: '' },
  options: [{ label: String, value: String }],
  min: Number, max: Number, minLength: Number, maxLength: Number,
  relation: { contentType: String, type: { type: String, enum: ['one','many'], default: 'one' } },
  order: { type: Number, default: 0 },
}, { _id: true });

const contentTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '', trim: true },
  icon: { type: String, default: '📄' },
  fields: [fieldSchema],
  isPublished: { type: Boolean, default: false },
  draftable: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

contentTypeSchema.pre('save', function(next) {
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});
module.exports = mongoose.model('ContentType', contentTypeSchema);
