require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ContentType = require('../models/ContentType');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existing) {
    await User.create({ name: process.env.ADMIN_NAME || 'Super Admin', email: process.env.ADMIN_EMAIL || 'admin@cms.com', password: process.env.ADMIN_PASSWORD || 'Admin@123456', role: 'superadmin' });
    console.log(`✅ Superadmin created: ${process.env.ADMIN_EMAIL}`);
  } else { console.log('ℹ️  Superadmin already exists'); }

  const blogExists = await ContentType.findOne({ slug: 'blog-posts' });
  if (!blogExists) {
    await ContentType.create({
      name: 'Blog Posts', icon: '📝', description: 'Articles and blog content', draftable: true, isPublished: true,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200, order: 0 },
        { name: 'slug', label: 'Slug', type: 'text', required: true, order: 1 },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea', order: 2 },
        { name: 'content', label: 'Content', type: 'richtext', order: 3 },
        { name: 'cover_image', label: 'Cover Image', type: 'media', order: 4 },
        { name: 'tags', label: 'Tags', type: 'tags', order: 5 },
        { name: 'author', label: 'Author', type: 'text', order: 6 },
        { name: 'published_at', label: 'Published At', type: 'date', order: 7 },
      ],
    });
    await ContentType.create({
      name: 'Products', icon: '🛍️', description: 'Product catalog', draftable: true, isPublished: true,
      fields: [
        { name: 'name', label: 'Product Name', type: 'text', required: true, order: 0 },
        { name: 'description', label: 'Description', type: 'richtext', order: 1 },
        { name: 'price', label: 'Price', type: 'number', required: true, min: 0, order: 2 },
        { name: 'sku', label: 'SKU', type: 'text', order: 3 },
        { name: 'stock', label: 'Stock', type: 'number', min: 0, order: 4 },
        { name: 'category', label: 'Category', type: 'select', options: [{ label: 'Electronics', value: 'electronics' }, { label: 'Clothing', value: 'clothing' }, { label: 'Books', value: 'books' }], order: 5 },
        { name: 'is_featured', label: 'Featured', type: 'boolean', defaultValue: false, order: 6 },
      ],
    });
    console.log('✅ Sample content types created: Blog Posts, Products');
  }

  console.log('\n🚀 Seed complete!');
  console.log(`   Login: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
  await mongoose.disconnect();
};

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
