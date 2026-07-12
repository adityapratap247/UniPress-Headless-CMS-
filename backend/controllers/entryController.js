const Entry = require('../models/Entry');
const ContentType = require('../models/ContentType');
const apiResponse = require('../utils/apiResponse');

const validateEntryData = (fields, data) => {
  const errors = [];
  for (const field of fields) {
    const value = data[field.name];
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: field.name, message: `${field.label} is required` });
      continue;
    }
    if (value !== undefined && value !== null && value !== '') {
      if (field.type === 'number' && isNaN(Number(value))) errors.push({ field: field.name, message: `${field.label} must be a number` });
      if (field.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) errors.push({ field: field.name, message: `${field.label} must be a valid email` });
      if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) errors.push({ field: field.name, message: `${field.label} must be a valid URL` });
      if (field.minLength && String(value).length < field.minLength) errors.push({ field: field.name, message: `${field.label} must be at least ${field.minLength} characters` });
      if (field.maxLength && String(value).length > field.maxLength) errors.push({ field: field.name, message: `${field.label} cannot exceed ${field.maxLength} characters` });
    }
  }
  return errors;
};

exports.getEntries = async (req, res) => {
  try {
    const { contentTypeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const ct = await ContentType.findById(contentTypeId);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');

    const filter = { contentType: contentTypeId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { 'data.title': { $regex: req.query.search, $options: 'i' } },
        { 'data.name': { $regex: req.query.search, $options: 'i' } },
        { 'data.slug': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [entries, total] = await Promise.all([
      Entry.find(filter).populate('createdBy', 'name email').populate('updatedBy', 'name email').sort('-updatedAt').skip(skip).limit(limit),
      Entry.countDocuments(filter),
    ]);

    apiResponse.paginated(res, { entries, contentType: ct }, {
      page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1,
    });
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.getEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id).populate('createdBy', 'name email').populate('updatedBy', 'name email');
    if (!entry) return apiResponse.notFound(res, 'Entry not found');
    apiResponse.success(res, { entry });
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.createEntry = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.contentTypeId);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    const { data, status, locale } = req.body;
    const errors = validateEntryData(ct.fields, data || {});
    if (errors.length > 0) return apiResponse.badRequest(res, 'Validation failed', errors);
    const entry = await Entry.create({
      contentType: ct._id, contentTypeSlug: ct.slug,
      data: data || {}, status: status || 'draft', locale: locale || 'en',
      createdBy: req.user._id, updatedBy: req.user._id,
    });
    apiResponse.created(res, { entry }, 'Entry created');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.updateEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return apiResponse.notFound(res, 'Entry not found');
    if (req.body.data) {
      const ct = await ContentType.findById(entry.contentType);
      const errors = validateEntryData(ct.fields, req.body.data);
      if (errors.length > 0) return apiResponse.badRequest(res, 'Validation failed', errors);
      entry.data = req.body.data;
    }
    if (req.body.status) entry.status = req.body.status;
    if (req.body.locale) entry.locale = req.body.locale;
    entry.updatedBy = req.user._id;
    await entry.save();
    apiResponse.success(res, { entry }, 'Entry updated');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) return apiResponse.notFound(res, 'Entry not found');
    apiResponse.success(res, {}, 'Entry deleted');
  } catch { apiResponse.error(res); }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return apiResponse.badRequest(res, 'IDs array required');
    const result = await Entry.deleteMany({ _id: { $in: ids } });
    apiResponse.success(res, { deletedCount: result.deletedCount }, `${result.deletedCount} entries deleted`);
  } catch { apiResponse.error(res); }
};

// Public API (API key protected)
exports.publicGetEntries = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const ct = await ContentType.findOne({ slug, isPublished: true });
    if (!ct) return apiResponse.notFound(res, 'Content type not found or not published');

    const apiKey = req.apiKey;
    if (apiKey.allowedContentTypes.length > 0 && !apiKey.allowedContentTypes.includes(slug)) {
      return apiResponse.forbidden(res, 'API key does not have access to this content type');
    }

    const filter = { contentTypeSlug: slug, status: 'published' };
    const reserved = ['page', 'limit', 'api_key', 'sort', 'order'];
    for (const [key, val] of Object.entries(req.query)) {
      if (!reserved.includes(key)) filter[`data.${key}`] = val;
    }

    const sortField = req.query.sort ? `data.${req.query.sort}` : 'publishedAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [entries, total] = await Promise.all([
      Entry.find(filter, { contentType: 0, contentTypeSlug: 0, __v: 0 }).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      Entry.countDocuments(filter),
    ]);

    apiResponse.paginated(res,
      entries.map(e => ({ id: e._id, ...e.data, status: e.status, publishedAt: e.publishedAt, createdAt: e.createdAt, updatedAt: e.updatedAt })),
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    );
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.publicGetEntry = async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, status: 'published' });
    if (!entry) return apiResponse.notFound(res, 'Entry not found');
    const ct = await ContentType.findById(entry.contentType);
    if (!ct || !ct.isPublished) return apiResponse.notFound(res, 'Entry not found');
    apiResponse.success(res, { id: entry._id, ...entry.data, status: entry.status, publishedAt: entry.publishedAt, createdAt: entry.createdAt, updatedAt: entry.updatedAt });
  } catch (err) { apiResponse.error(res, err.message); }
};
