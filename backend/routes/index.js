const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const contentTypeController = require('../controllers/contentTypeController');
const entryController = require('../controllers/entryController');
const mediaController = require('../controllers/mediaController');
const apiKeyController = require('../controllers/apiKeyController');
const { protect, restrictTo, apiKeyAuth } = require('../middleware/auth');
const { validate, authSchemas, contentTypeSchemas, entrySchemas } = require('../middleware/validate');

// Auth
router.post('/auth/login', validate(authSchemas.login), authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', protect, authController.logout);
router.get('/auth/me', protect, authController.getMe);
router.patch('/auth/me', protect, authController.updateMe);
router.patch('/auth/change-password', protect, validate(authSchemas.changePassword), authController.changePassword);

// Users
router.get('/users', protect, restrictTo('superadmin', 'admin'), authController.getUsers);
router.post('/users', protect, restrictTo('superadmin', 'admin'), validate(authSchemas.register), authController.createUser);
router.patch('/users/:id', protect, restrictTo('superadmin', 'admin'), authController.updateUser);
router.delete('/users/:id', protect, restrictTo('superadmin'), authController.deleteUser);

// Content Types
router.get('/content-types', protect, contentTypeController.getAll);
router.post('/content-types', protect, restrictTo('superadmin', 'admin'), validate(contentTypeSchemas.create), contentTypeController.create);
router.get('/content-types/:id', protect, contentTypeController.getOne);
router.patch('/content-types/:id', protect, restrictTo('superadmin', 'admin'), validate(contentTypeSchemas.update), contentTypeController.update);
router.delete('/content-types/:id', protect, restrictTo('superadmin', 'admin'), contentTypeController.delete);
router.post('/content-types/:id/fields', protect, restrictTo('superadmin', 'admin'), contentTypeController.addField);
router.patch('/content-types/:id/fields/:fieldId', protect, restrictTo('superadmin', 'admin'), contentTypeController.updateField);
router.delete('/content-types/:id/fields/:fieldId', protect, restrictTo('superadmin', 'admin'), contentTypeController.deleteField);

// Entries (Admin)
router.get('/content-types/:contentTypeId/entries', protect, entryController.getEntries);
router.post('/content-types/:contentTypeId/entries', protect, restrictTo('superadmin', 'admin', 'editor'), validate(entrySchemas.create), entryController.createEntry);
router.get('/entries/:id', protect, entryController.getEntry);
router.patch('/entries/:id', protect, restrictTo('superadmin', 'admin', 'editor'), validate(entrySchemas.update), entryController.updateEntry);
router.delete('/entries/:id', protect, restrictTo('superadmin', 'admin'), entryController.deleteEntry);
router.post('/entries/bulk-delete', protect, restrictTo('superadmin', 'admin'), entryController.bulkDelete);

// Media
router.get('/media', protect, mediaController.getAll);
router.post('/media/upload', protect, mediaController.uploadMiddleware, mediaController.upload);
router.get('/media/folders', protect, mediaController.getFolders);
router.get('/media/:id', protect, mediaController.getOne);
router.patch('/media/:id', protect, mediaController.update);
router.delete('/media/:id', protect, restrictTo('superadmin', 'admin'), mediaController.delete);

// API Keys
router.get('/api-keys', protect, restrictTo('superadmin', 'admin'), apiKeyController.getAll);
router.post('/api-keys', protect, restrictTo('superadmin', 'admin'), apiKeyController.create);
router.patch('/api-keys/:id/revoke', protect, restrictTo('superadmin', 'admin'), apiKeyController.revoke);
router.delete('/api-keys/:id', protect, restrictTo('superadmin', 'admin'), apiKeyController.delete);

// Dashboard Stats
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const ContentType = require('../models/ContentType');
    const Entry = require('../models/Entry');
    const Media = require('../models/Media');
    const User = require('../models/User');
    const apiResponse = require('../utils/apiResponse');
    const [ctCount, entryCount, mediaCount, userCount, publishedCount, draftCount, recentEntries, contentTypes] = await Promise.all([
      ContentType.countDocuments(), Entry.countDocuments(), Media.countDocuments(), User.countDocuments(),
      Entry.countDocuments({ status: 'published' }), Entry.countDocuments({ status: 'draft' }),
      Entry.find().sort('-createdAt').limit(5).populate('createdBy', 'name'),
      ContentType.find().select('name slug icon').sort('-createdAt').limit(8),
    ]);
    apiResponse.success(res, {
      stats: { contentTypes: ctCount, entries: entryCount, media: mediaCount, users: userCount, published: publishedCount, drafts: draftCount },
      recentEntries, contentTypes,
    });
  } catch (err) { require('../utils/apiResponse').error(res); }
});

// Public Content API
router.get('/v1/content/:slug', apiKeyAuth, entryController.publicGetEntries);
router.get('/v1/content/:slug/:id', apiKeyAuth, entryController.publicGetEntry);

module.exports = router;
