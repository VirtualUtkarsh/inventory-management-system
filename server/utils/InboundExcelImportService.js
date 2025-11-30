// server/utils/InboundExcelImportService.js 
const XLSX = require('xlsx');
const Inset = require('../models/Inset');
const Inventory = require('../models/Inventory');
const Bin = require('../models/bin');
const AuditLog = require('../models/AuditLog');

class InboundExcelImportService {
  constructor(userId, username) {
    this.userId = userId;
    this.username = username;
    this.results = {
      totalRows: 0,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      warnings: [],
      errors: [],
      failedEntries: [], // NEW: Track failed entries with full data
      summary: []
    };
  }

  /**
   * Main import function for inbound Excel files
   */
  async importInboundExcel(buffer) {
    try {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with expected headers
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });

      if (rawData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      // Parse headers and validate
      const headers = this.parseHeaders(rawData[0]);
      const dataRows = rawData.slice(1).filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      this.results.totalRows = dataRows.length;
      console.log(`📊 Processing ${this.results.totalRows} inbound rows from Excel file`);

      // Pre-fetch all valid bins for validation
      const validBins = await this.fetchValidBins();
      console.log(`✅ Found ${validBins.size} valid bins in database`);

      // Process in batches of 50 for better performance
      const BATCH_SIZE = 50;
      for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch, headers, i + 2, validBins); // +2 for Excel row numbers
      }

      // Generate summary
      this.generateSummary();
      
      return this.results;

    } catch (error) {
      console.error('❌ Inbound Excel import failed:', error);
      this.results.errors.push({
        row: 0,
        message: `Import failed: ${error.message}`,
        type: 'CRITICAL'
      });
      return this.results;
    }
  }

  /**
   * Fetch all valid bins from database
   */
  async fetchValidBins() {
    try {
      const bins = await Bin.find({ isActive: true }).select('name');
      return new Set(bins.map(bin => bin.name.toUpperCase()));
    } catch (error) {
      console.error('❌ Failed to fetch bins:', error);
      throw new Error('Failed to fetch valid bins from database');
    }
  }

  /**
   * Parse and validate headers from first row
   */
  parseHeaders(headerRow) {
    const headerMap = {};
    
    headerRow.forEach((header, index) => {
      if (!header) return;
      
      const cleanHeader = header.toString().toLowerCase().trim();
      
      // Map various possible header names to standard fields
      if (cleanHeader.includes('sku')) {
        headerMap.sku = index;
      } else if (cleanHeader.includes('bin')) {
        headerMap.bin = index;
      } else if (cleanHeader.includes('balance') || cleanHeader.includes('qty') || cleanHeader.includes('quantity')) {
        headerMap.quantity = index;
      }
    });

    // Validate required headers exist
    const missingHeaders = [];
    if (headerMap.sku === undefined) missingHeaders.push('SKU');
    if (headerMap.bin === undefined) missingHeaders.push('BIN NO./BIN LOCATION');
    if (headerMap.quantity === undefined) missingHeaders.push('QUANTITY/BALANCE');

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headerRow.filter(h => h).join(', ')}`);
    }

    console.log('✅ Headers mapped for inbound:', { 
      sku: headerRow[headerMap.sku],
      bin: headerRow[headerMap.bin], 
      quantity: headerRow[headerMap.quantity] 
    });

    return headerMap;
  }

  /**
   * Process a batch of rows
   */
  async processBatch(batch, headers, startRowNum, validBins) {
    const promises = batch.map(async (row, batchIndex) => {
      const rowNum = startRowNum + batchIndex;
      return this.processRow(row, headers, rowNum, validBins);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Process a single row for inbound records
   */
  async processRow(row, headers, rowNum, validBins) {
    try {
      // Extract data from row
      const sku = this.cleanValue(row[headers.sku]);
      const binString = this.cleanValue(row[headers.bin]);
      const quantityStr = this.cleanValue(row[headers.quantity]);

      // Validate required fields
      if (!sku) {
        throw new Error('SKU is required');
      }
      if (!binString) {
        throw new Error('BIN LOCATION is required');
      }
      if (!quantityStr) {
        throw new Error('QUANTITY is required');
      }

      // Parse quantity
      const quantity = this.parseQuantity(quantityStr);
      if (quantity <= 0) {
        throw new Error(`Invalid quantity: ${quantityStr}`);
      }

      // For inbound, we expect single bin
      const bin = binString.trim().toUpperCase();

      // 🚀 CRITICAL: Check if bin exists in database - DO NOT CREATE
      if (!validBins.has(bin)) {
        throw new Error(`Bin "${bin}" does not exist in database. Please create the bin first.`);
      }

      console.log(`🔄 Row ${rowNum}: Processing inbound SKU "${sku}" to bin "${bin}" with quantity ${quantity}`);

      // Prepare inbound record data
      const insetData = {
        skuId: sku.trim().toUpperCase(),
        bin: bin,
        quantity: quantity,
        user: {
          id: this.userId,
          name: this.username || 'Excel Import'
        }
      };

      // Create a NEW inbound record for each Excel row
      const inset = new Inset(insetData);
      const savedInset = await inset.save();
      
      console.log(`✅ Inbound record created: ${savedInset._id} | SKU: ${savedInset.skuId} | Bin: ${savedInset.bin} | Qty: ${savedInset.quantity}`);

      // Update inventory
      try {
        const inventoryItem = await Inventory.updateStock(
          savedInset.skuId,
          savedInset.quantity,
          savedInset.bin
        );

        console.log(`📦 Inventory updated: ${inventoryItem.skuId} in ${inventoryItem.bin} -> ${inventoryItem.quantity}`);
      } catch (invError) {
        console.error(`⚠️ Failed to update inventory for ${sku}:`, invError.message);
        // Add as warning but don't fail the inbound record creation
        this.results.warnings.push({
          row: rowNum,
          sku,
          bin,
          message: `Inbound recorded but inventory update failed: ${invError.message}`,
          type: 'INVENTORY_WARNING'
        });
      }

      // Create audit log
      await this.createAuditLog('INBOUND_CREATED', savedInset._id, { 
        sku: savedInset.skuId, 
        bin: savedInset.bin, 
        quantity: savedInset.quantity,
        source: 'Excel Import'
      });

      // Record success
      this.results.successCount++;
      this.results.summary.push({
        row: rowNum,
        sku: savedInset.skuId,
        bin: savedInset.bin,
        quantity: savedInset.quantity,
        status: 'SUCCESS'
      });

      this.results.processedRows++;

    } catch (error) {
      console.error(`❌ Inbound row ${rowNum} failed:`, error.message);
      this.results.errorCount++;
      
      // Add to errors array
      this.results.errors.push({
        row: rowNum,
        data: row,
        message: error.message,
        type: 'ROW_ERROR'
      });

      // 🚀 NEW: Add to failedEntries with full data for user reference
      this.results.failedEntries.push({
        row: rowNum,
        sku: this.cleanValue(row[headers.sku]),
        bin: this.cleanValue(row[headers.bin]),
        quantity: this.cleanValue(row[headers.quantity]),
        reason: error.message
      });

      this.results.processedRows++;
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(actionType, documentId, changes) {
    try {
      await new AuditLog({
        actionType,
        collectionName: 'Inset',
        documentId,
        changes,
        user: {
          id: this.userId,
          name: this.username || 'Excel Import'
        }
      }).save();
    } catch (error) {
      console.error('⚠️ Failed to create audit log:', error);
      // Don't throw - audit log failure shouldn't stop the import
    }
  }

  /**
   * Utility functions
   */
  cleanValue(value) {
    if (value === null || value === undefined) return '';
    return value.toString().trim();
  }

  parseQuantity(str) {
    const num = parseFloat(str.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
  }

  generateSummary() {
    const successRate = this.results.totalRows > 0 ? 
      (this.results.successCount / this.results.totalRows * 100).toFixed(1) : 0;

    this.results.stats = {
      successRate: `${successRate}%`,
      warningCount: this.results.warnings.length,
      failedEntriesCount: this.results.failedEntries.length
    };

    console.log(`
📊 INBOUND IMPORT SUMMARY:
   Total Rows: ${this.results.totalRows}
   Processed: ${this.results.processedRows}
   Successful: ${this.results.successCount}
   Errors: ${this.results.errorCount}
   Warnings: ${this.results.warnings.length}
   Failed Entries: ${this.results.failedEntries.length}
   Success Rate: ${successRate}%
    `);
  }
}

module.exports = InboundExcelImportService;