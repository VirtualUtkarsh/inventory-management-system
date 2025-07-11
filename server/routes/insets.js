const Inset = require('../models/Inset');

// Create a new inset (inbound entry)
exports.createInset = async (req, res) => {
  try {
    const inset = new Inset(req.body);
    await inset.save();
    res.status(201).json(inset);
  } catch (error) {
    console.error('❌ Inset creation failed:', error);
    res.status(500).json({ message: 'Inset creation failed' });
  }
};

// Get all insets (inbound history)
exports.getInsets = async (req, res) => {
  try {
    const insets = await Inset.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(insets);
  } catch (error) {
    console.error('❌ Fetch insets failed:', error);
    res.status(500).json({ message: 'Failed to fetch inset history' });
  }
};
