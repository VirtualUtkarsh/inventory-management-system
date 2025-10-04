// server/controllers/metadataController.js
const ProductSize = require('../models/ProductSize');
const Color = require('../models/Color');
const Pack = require('../models/Pack');
const ProductCategory = require('../models/ProductCategory');
const Bin = require('../models/bin');

// Generic CRUD functions for all metadata types
const createMetadataController = (Model, name) => ({
  // GET all active items
  getAll: async (req, res) => {
    try {
      const items = await Model.find({ isActive: true }).sort({ name: 1 });
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: `Failed to fetch ${name}s`, error: error.message });
    }
  },

  // POST create new item
  create: async (req, res) => {
    try {
      const item = new Model({
        ...req.body,
        createdBy: req.user.id
      });
      await item.save();
      res.status(201).json(item);
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({ message: `${name} already exists` });
      } else {
        res.status(400).json({ message: `Failed to create ${name}`, error: error.message });
      }
    }
  },

  // PUT update item
  update: async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!item) {
        return res.status(404).json({ message: `${name} not found` });
      }
      res.json(item);
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({ message: `${name} already exists` });
      } else {
        res.status(400).json({ message: `Failed to update ${name}`, error: error.message });
      }
    }
  },

  // DELETE (soft delete by setting isActive: false)
  delete: async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      if (!item) {
        return res.status(404).json({ message: `${name} not found` });
      }
      res.json({ message: `${name} deleted successfully` });
    } catch (error) {
      res.status(400).json({ message: `Failed to delete ${name}`, error: error.message });
    }
  }
});

// Create controllers for each metadata type
const sizeController = createMetadataController(ProductSize, 'Size');
const colorController = createMetadataController(Color, 'Color');
const packController = createMetadataController(Pack, 'Pack');
const categoryController = createMetadataController(ProductCategory, 'Category');
const binController = createMetadataController(Bin, 'Bin');

// Initialize default data
const initializeDefaultData = async (userId) => {
  try {
    // Default sizes
    const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE SIZE'];
    for (const size of defaultSizes) {
      await ProductSize.findOneAndUpdate(
        { name: size },
        { name: size, createdBy: userId, isActive: true },
        { upsert: true, new: true }
      );
    }

    // Default colors
    const defaultColors = ['BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'GRAY', 'NAVY'];
    for (const color of defaultColors) {
      await Color.findOneAndUpdate(
        { name: color },
        { name: color, createdBy: userId, isActive: true },
        { upsert: true, new: true }
      );
    }

    // Default packs
    const defaultPacks = ['PACK OF 1', 'PACK OF 2', 'PACK OF 3', 'PACK OF 5', 'PACK OF 10'];
    for (const pack of defaultPacks) {
      await Pack.findOneAndUpdate(
        { name: pack },
        { name: pack, createdBy: userId, isActive: true },
        { upsert: true, new: true }
      );
    }

    // Default categories
    const defaultCategories = ['Clothing', 'Electronics', 'Accessories', 'Home & Garden', 'Sports'];
    for (const category of defaultCategories) {
      await ProductCategory.findOneAndUpdate(
        { name: category },
        { name: category, createdBy: userId, isActive: true },
        { upsert: true, new: true }
      );
    }

    // Default bins
    const defaultBins = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'Storage-01', 'Storage-02'];
    for (const bin of defaultBins) {
      await Bin.findOneAndUpdate(
        { name: bin },
        { name: bin, createdBy: userId, isActive: true },
        { upsert: true, new: true }
      );
    }

    console.log('✅ Default metadata initialized');
  } catch (error) {
    console.error('❌ Error initializing default metadata:', error);
  }
};

// Get all metadata for forms (combined endpoint)
const getAllMetadata = async (req, res) => {
  try {
    const [sizes, colors, packs, categories, bins] = await Promise.all([
      ProductSize.find({ isActive: true }).sort({ name: 1 }),
      Color.find({ isActive: true }).sort({ name: 1 }),
      Pack.find({ isActive: true }).sort({ name: 1 }),
      ProductCategory.find({ isActive: true }).sort({ name: 1 }),
      Bin.find({ isActive: true }).sort({ name: 1 })
    ]);

    res.json({
      sizes: sizes.map(s => s.name),
      colors: colors.map(c => c.name),
      packs: packs.map(p => p.name),
      categories: categories.map(cat => cat.name),
      bins: bins.map(b => b.name)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch metadata', error: error.message });
  }
};

module.exports = {
  sizes: sizeController,
  colors: colorController,
  packs: packController,
  categories: categoryController,
  bins: binController,
  initializeDefaultData,
  getAllMetadata
};