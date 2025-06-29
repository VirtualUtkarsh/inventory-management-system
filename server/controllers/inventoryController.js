const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');

const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ sku: 1 });
    res.json(inventory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const updateQuantity = async (req, res) => {
  const { sku, change, bin } = req.body;

  try {
    const item = await Inventory.updateStock(sku, change, bin);

    // Log the update
    const log = new AuditLog({
      actionType: change > 0 ? 'CREATE' : 'UPDATE',
      collectionName: 'Inventory',
      documentId: item._id,
      changes: {
        oldValue: { quantity: item.quantity - change },
        newValue: { quantity: item.quantity }
      },
      user: {
        id: req.user._id,
        name: req.user.name
      }
    });
    await log.save();

    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { getInventory, updateQuantity };
