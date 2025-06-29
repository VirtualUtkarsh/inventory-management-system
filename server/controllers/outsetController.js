const Outset = require('../models/Outset');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const createOutset = async (req, res) => {
  const { sku, orderNo, bin, quantity, customerName, invoiceNo } = req.body;

  try {
    // Update inventory first (negative quantity)
    const inventoryItem = await Inventory.updateStock(sku, -quantity, bin);

    // Then create outset record
    const outset = new Outset({
      sku,
      orderNo,
      bin,
      quantity,
      customerName,
      invoiceNo,
      user: {
        id: req.user._id,
        name: req.user.name
      }
    });
    await outset.save();

    // Log the actions
    const log = new AuditLog({
      actionType: 'CREATE',
      collectionName: 'Outset',
      documentId: outset._id,
      user: {
        id: req.user._id,
        name: req.user.name
      }
    });
    await log.save();

    res.status(201).json(outset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const getOutsets = async (req, res) => {
  try {
    const outsets = await Outset.find().sort({ createdAt: -1 });
    res.json(outsets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { createOutset, getOutsets };
    