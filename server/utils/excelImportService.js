// server/utils/excelImportService.js
const XLSX = require('xlsx');
const Inventory = require('../models/Inventory');
const Bin = require('../models/bin');
const AuditLog = require('../models/AuditLog');

class ExcelImportService {
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
      createdBins: [],
      summary: []
    };
  }

  /**
   * Main import function for inventory Excel files
   */
  async importInventoryExcel(buffer) {
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
      console.log(`📊 Processing ${this.results.totalRows} rows from Excel file`);

      // Process in batches of 100 for better performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch, headers, i + 2); // +2 for Excel row numbers (1-indexed + header)
      }

      // Generate summary
      this.generateSummary();
      
      return this.results;

    } catch (error) {
      console.error('❌ Excel import failed:', error);
      this.results.errors.push({
        row: 0,
        message: `Import failed: ${error.message}`,
        type: 'CRITICAL'
      });
      return this.results;
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
    if (headerMap.bin === undefined) missingHeaders.push('BIN NO.');
    if (headerMap.quantity === undefined) missingHeaders.push('BALANCE/QUANTITY');

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headerRow.filter(h => h).join(', ')}`);
    }

    console.log('✅ Headers mapped:', { 
      sku: headerRow[headerMap.sku],
      bin: headerRow[headerMap.bin], 
      quantity: headerRow[headerMap.quantity] 
    });

    return headerMap;
  }

  /**
   * Process a batch of rows
   */
  async processBatch(batch, headers, startRowNum) {
    const promises = batch.map(async (row, batchIndex) => {
      const rowNum = startRowNum + batchIndex;
      return this.processRow(row, headers, rowNum);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Process a single row
   */
  async processRow(row, headers, rowNum) {
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
        throw new Error('BIN NO. is required');
      }
      if (!quantityStr) {
        throw new Error('BALANCE/QUANTITY is required');
      }

      // Parse quantity
      const totalQuantity = this.parseQuantity(quantityStr);
      if (totalQuantity <= 0) {
        throw new Error(`Invalid quantity: ${quantityStr}`);
      }

      // Parse bins (comma-separated)
      const bins = this.parseBins(binString);
      if (bins.length === 0) {
        throw new Error(`No valid bins found in: ${binString}`);
      }

      // Split quantity equally across bins
      const quantityPerBin = Math.floor(totalQuantity / bins.length);
      const remainder = totalQuantity % bins.length;

      console.log(`🔄 Row ${rowNum}: Processing SKU "${sku}" across ${bins.length} bins (${quantityPerBin} each, ${remainder} extra)`);

      // Process each bin
      const binResults = [];
      for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const quantity = quantityPerBin + (i < remainder ? 1 : 0); // Distribute remainder

        try {
          // Auto-create bin if needed
          await this.ensureBinExists(bin);

          // Update inventory
          const item = await Inventory.updateStock(sku, quantity, bin);
          
          binResults.push({
            bin,
            quantity,
            action: 'ADDED',
            newTotal: item.quantity
          });

          // Create audit log
          await this.createAuditLog('STOCK_INCREASE', item._id, { sku, bin, quantity });

        } catch (binError) {
          binResults.push({
            bin,
            quantity,
            action: 'ERROR',
            error: binError.message
          });
          
          this.results.errors.push({
            row: rowNum,
            sku,
            bin,
            message: `Bin processing failed: ${binError.message}`,
            type: 'BIN_ERROR'
          });
        }
      }

      // Record success/partial success
      const successfulBins = binResults.filter(r => r.action === 'ADDED').length;
      if (successfulBins > 0) {
        this.results.successCount++;
        this.results.summary.push({
          row: rowNum,
          sku,
          totalBins: bins.length,
          successfulBins,
          totalQuantity,
          details: binResults
        });
      }

      if (successfulBins < bins.length) {
        this.results.warnings.push({
          row: rowNum,
          sku,
          message: `Only ${successfulBins}/${bins.length} bins processed successfully`,
          type: 'PARTIAL_SUCCESS'
        });
      }

      this.results.processedRows++;

    } catch (error) {
      console.error(`❌ Row ${rowNum} failed:`, error.message);
      this.results.errorCount++;
      this.results.errors.push({
        row: rowNum,
        data: row,
        message: error.message,
        type: 'ROW_ERROR'
      });
      this.results.processedRows++;
    }
  }

  /**
   * Ensure bin exists, create if needed
   */
  async ensureBinExists(binName) {
    try {
      const existingBin = await Bin.findOne({ name: binName, isActive: true });
      
      if (!existingBin) {
        const newBin = new Bin({
          name: binName,
          isActive: true
        });
        
        await newBin.save();
        
        if (!this.results.createdBins.includes(binName)) {
          this.results.createdBins.push(binName);
          console.log(`✨ Auto-created bin: ${binName}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to create bin ${binName}:`, error);
      throw new Error(`Failed to create bin ${binName}: ${error.message}`);
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(actionType, documentId, changes) {
    try {
      await new AuditLog({
        actionType,
        collectionName: 'Inventory',
        documentId,
        changes,
        user: {
          id: this.userId,
          name: this.username
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

  parseBins(binString) {
    return binString
      .split(',')
      .map(bin => bin.trim())
      .filter(bin => bin.length > 0)
      .map(bin => bin.toUpperCase()); // Normalize to uppercase
  }

  generateSummary() {
    const successRate = this.results.totalRows > 0 ? 
      (this.results.successCount / this.results.totalRows * 100).toFixed(1) : 0;

    console.log(`
📊 IMPORT SUMMARY:
   Total Rows: ${this.results.totalRows}
   Processed: ${this.results.processedRows}
   Successful: ${this.results.successCount}
   Errors: ${this.results.errorCount}
   Warnings: ${this.results.warnings.length}
   Success Rate: ${successRate}%
   Bins Created: ${this.results.createdBins.length}
    `);
  }
}

module.exports = ExcelImportService;