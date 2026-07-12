const ContentType = require('../models/ContentType');
const Entry = require('../models/Entry');
const apiResponse = require('../utils/apiResponse');

exports.create = async (req, res) => {
  try {
    const ct = await ContentType.create({ ...req.body, createdBy: req.user._id });
    apiResponse.created(res, { contentType: ct }, 'Content type created');
  } catch (err) {
    if (err.code === 11000) return apiResponse.badRequest(res, 'Content type name already exists');
    apiResponse.error(res, err.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const cts = await ContentType.find().populate('createdBy', 'name email').sort('-createdAt');
    const withCounts = await Promise.all(cts.map(async (ct) => {
      const obj = ct.toObject();
      obj.entriesCount = await Entry.countDocuments({ contentType: ct._id });
      return obj;
    }));
    apiResponse.success(res, { contentTypes: withCounts, total: withCounts.length });
  } catch { apiResponse.error(res); }
};

exports.getOne = async (req, res) => {
  try {
    const isId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const ct = await ContentType.findOne(isId ? { _id: req.params.id } : { slug: req.params.id }).populate('createdBy', 'name email');
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    apiResponse.success(res, { contentType: ct });
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.update = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.id);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    Object.assign(ct, { ...req.body, updatedBy: req.user._id });
    await ct.save();
    apiResponse.success(res, { contentType: ct }, 'Content type updated');
  } catch (err) {
    if (err.code === 11000) return apiResponse.badRequest(res, 'Content type name already exists');
    apiResponse.error(res, err.message);
  }
};

exports.delete = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.id);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    const count = await Entry.countDocuments({ contentType: ct._id });
    if (count > 0) return apiResponse.badRequest(res, `Cannot delete: ${count} entries exist`);
    await ct.deleteOne();
    apiResponse.success(res, {}, 'Content type deleted');
  } catch { apiResponse.error(res); }
};

exports.addField = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.id);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    if (ct.fields.some(f => f.name === req.body.name)) return apiResponse.badRequest(res, `Field '${req.body.name}' already exists`);
    ct.fields.push({ ...req.body, order: ct.fields.length });
    ct.updatedBy = req.user._id;
    await ct.save();
    apiResponse.success(res, { contentType: ct }, 'Field added');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.updateField = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.id);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    const idx = ct.fields.findIndex(f => f._id.toString() === req.params.fieldId);
    if (idx === -1) return apiResponse.notFound(res, 'Field not found');
    Object.assign(ct.fields[idx], req.body);
    ct.updatedBy = req.user._id;
    await ct.save();
    apiResponse.success(res, { contentType: ct }, 'Field updated');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.deleteField = async (req, res) => {
  try {
    const ct = await ContentType.findById(req.params.id);
    if (!ct) return apiResponse.notFound(res, 'Content type not found');
    const idx = ct.fields.findIndex(f => f._id.toString() === req.params.fieldId);
    if (idx === -1) return apiResponse.notFound(res, 'Field not found');
    ct.fields.splice(idx, 1);
    await ct.save();
    apiResponse.success(res, { contentType: ct }, 'Field deleted');
  } catch { apiResponse.error(res); }
};
