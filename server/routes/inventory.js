     // server/routes/inventory.js
     const express = require('express');
     const Inventory = require('../models/Inventory');
     const AuditLog = require('../models/AuditLog');
     const verifyToken= require('../middleware/auth');

     const router = express.Router();

     // Get Inventory
     router.get('/', verifyToken, async (req, res) => {
         const inventory = await Inventory.find();
         res.json(inventory);
     });

     // Inset (Inbound)
     router.post('/inset', verifyToken, async (req, res) => {
         const { sku, orderNo, bin } = req.body;
         const existingItem = await Inventory.findOne({ sku });

         if (existingItem) {
             existingItem.quantity += 1; // Increase quantity
             await existingItem.save();
         } else {
             const newItem = new Inventory({ sku, orderNo, bin, quantity: 1, createdBy: req.userId });
             await newItem.save();
         }

         // Log the action
         const log = new AuditLog({
             actionType: 'CREATE',
             collection: 'Inventory',
             documentId: sku,
             userId: req.userId,
             userName: req.username,
         });
         await log.save();

         res.status(201).json({ message: 'Item added to inventory' });
     });

     // Outset (Outbound)
     router.post('/outset', verifyToken, async (req, res) => {
         const { sku, orderNo, bin, customerName, invoiceNo } = req.body;
         const existingItem = await Inventory.findOne({ sku });

         if (existingItem) {
             existingItem.quantity -= 1; // Decrease quantity
             if (existingItem.quantity <= 0) {
                 await Inventory.deleteOne({ sku });
             } else {
                 await existingItem.save();
             }

             // Log the action
             const log = new AuditLog({
                 actionType: 'DELETE',
                 collection: 'Inventory',
                 documentId: sku,
                 userId: req.userId,
                 userName: req.username,
             });
             await log.save();

             res.json({ message: 'Item removed from inventory' });
         } else {
             res.status(404).json({ message: 'Item not found' });
         }
     });

     module.exports = router;
     