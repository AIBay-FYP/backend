const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String, required: true },
  imageUrl: { type: String, required: true },
  description: { type: String },
}, { collection: 'Category' });

module.exports = mongoose.model('Category', categorySchema);
