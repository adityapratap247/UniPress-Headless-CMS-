const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Media = require('../models/Media');
const apiResponse = require('../utils/apiResponse');

const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'general';
    const dest = path.join(uploadPath, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'application/pdf','video/mp4','video/webm','audio/mpeg','audio/wav',
    'text/plain','application/json','application/zip'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type ${file.mimetype} not allowed`), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 } });
exports.uploadMiddleware = upload.array('files', 10);

exports.upload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return apiResponse.badRequest(res, 'No files uploaded');
    const folder = req.body.folder || 'general';
    const mediaItems = await Promise.all(req.files.map(async (file) => {
      return Media.create({
        filename: file.filename, originalname: file.originalname,
        mimetype: file.mimetype, size: file.size,
        url: `/uploads/${folder}/${file.filename}`,
        path: file.path, folder, alt: req.body.alt || '',
        caption: req.body.caption || '', createdBy: req.user._id,
      });
    }));
    apiResponse.created(res, { media: mediaItems }, `${mediaItems.length} file(s) uploaded`);
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.folder) filter.folder = req.query.folder;
    if (req.query.type === 'image') filter.mimetype = { $regex: '^image/' };
    else if (req.query.type === 'video') filter.mimetype = { $regex: '^video/' };
    else if (req.query.type === 'document') filter.mimetype = { $in: ['application/pdf','text/plain'] };
    const [media, total] = await Promise.all([
      Media.find(filter).populate('createdBy', 'name').sort('-createdAt').skip(skip).limit(limit),
      Media.countDocuments(filter),
    ]);
    apiResponse.paginated(res, { media }, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch { apiResponse.error(res); }
};

exports.getOne = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).populate('createdBy', 'name email');
    if (!media) return apiResponse.notFound(res, 'Media not found');
    apiResponse.success(res, { media });
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.update = async (req, res) => {
  try {
    const media = await Media.findByIdAndUpdate(req.params.id, { alt: req.body.alt, caption: req.body.caption }, { new: true });
    if (!media) return apiResponse.notFound(res, 'Media not found');
    apiResponse.success(res, { media }, 'Media updated');
  } catch (err) { apiResponse.error(res, err.message); }
};

exports.delete = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return apiResponse.notFound(res, 'Media not found');
    if (fs.existsSync(media.path)) fs.unlinkSync(media.path);
    await media.deleteOne();
    apiResponse.success(res, {}, 'Media deleted');
  } catch { apiResponse.error(res); }
};

exports.getFolders = async (req, res) => {
  try {
    const folders = await Media.distinct('folder');
    apiResponse.success(res, { folders });
  } catch { apiResponse.error(res); }
};
