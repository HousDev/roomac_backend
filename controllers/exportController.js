// backend/controllers/exportController.js
const ExcelJS = require('exceljs');
const service = require("../models/masterModel");
const path = require('path');
const fs = require('fs');
const os = require('os');

// Helper function to create temporary directory
const getTempDir = () => {
  const tempDir = path.join(os.tmpdir(), 'exports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

// Helper function to cleanup old files
const cleanupOldFiles = () => {
  const tempDir = getTempDir();
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
    }
  });
};

/* ========== EXPORT MASTER TYPES ========== */
exports.exportMasterTypes = async (req, res) => {
  try {
    const { format = 'excel', filters = '{}' } = req.query;
    const filterParams = JSON.parse(filters);
    
    // Get data
    const types = await service.getMasterTypes();
    
    // Apply filters if provided
    let filteredData = types;
    if (filterParams.search) {
      filteredData = filteredData.filter(type => 
        type.name.toLowerCase().includes(filterParams.search.toLowerCase())
      );
    }
    if (filterParams.status === 'active') {
      filteredData = filteredData.filter(type => type.is_active);
    } else if (filterParams.status === 'inactive') {
      filteredData = filteredData.filter(type => !type.is_active);
    }

    if (format === 'csv') {
      await exportAsCSV(res, filteredData, 'master-types');
    } else {
      await exportAsExcel(res, filteredData, 'master-types');
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Export failed',
      message: error.message 
    });
  }
};

/* ========== EXPORT MASTER VALUES ========== */
exports.exportMasterValues = async (req, res) => {
  try {
    const { typeId } = req.params;
    const { format = 'excel', filters = '{}' } = req.query;
    const filterParams = JSON.parse(filters);
    
    // Get type info
    const allTypes = await service.getMasterTypes();
    const typeInfo = allTypes.find(t => t.id == typeId);
    
    if (!typeInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Master type not found' 
      });
    }

    // Get values
    const values = await service.getMasterValues(typeId);
    
    // Apply filters if provided
    let filteredData = values;
    if (filterParams.search) {
      filteredData = filteredData.filter(value => 
        value.value.toLowerCase().includes(filterParams.search.toLowerCase())
      );
    }
    if (filterParams.status === 'active') {
      filteredData = filteredData.filter(value => value.is_active);
    } else if (filterParams.status === 'inactive') {
      filteredData = filteredData.filter(value => !value.is_active);
    }

    const fileName = `${typeInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-values`;
    
    if (format === 'csv') {
      await exportAsCSV(res, filteredData, fileName, typeInfo.name);
    } else {
      await exportAsExcel(res, filteredData, fileName, typeInfo.name);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Export failed',
      message: error.message 
    });
  }
};

/* ========== EXPORT BOTH TYPES AND VALUES ========== */
exports.exportAllData = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Roomac CRM';
    workbook.created = new Date();
    
    // Get types
    const types = await service.getMasterTypes();
    
    // Create Types sheet
    const typesSheet = workbook.addWorksheet('Master Types');
    typesSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Type Name', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created Date', key: 'created_at', width: 20 },
      { header: 'Total Values', key: 'values_count', width: 15 }
    ];
    
    // Add types data
    for (const type of types) {
      const values = await service.getMasterValues(type.id);
      typesSheet.addRow({
        id: type.id,
        name: type.name,
        status: type.is_active ? 'Active' : 'Inactive',
        created_at: new Date(type.created_at),
        values_count: values.length
      });
    }

    // Style the header row
    typesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    typesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2C5282' }
    };

    // Add Values sheets for each type
    for (const type of types) {
      const values = await service.getMasterValues(type.id);
      if (values.length > 0) {
        const sheetName = type.name.substring(0, 31); // Excel sheet name limit
        const valuesSheet = workbook.addWorksheet(sheetName);
        
        valuesSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Value', key: 'value', width: 40 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created Date', key: 'created_at', width: 20 }
        ];
        
        // Add values data
        values.forEach(value => {
          valuesSheet.addRow({
            id: value.id,
            value: value.value,
            status: value.is_active ? 'Active' : 'Inactive',
            created_at: new Date(value.created_at)
          });
        });

        // Style header
        valuesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        valuesSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2D3748' }
        };
      }
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="master-data-${Date.now()}.xlsx"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Export failed',
      message: error.message 
    });
  }
};

/* ========== HELPER FUNCTIONS ========== */
async function exportAsExcel(res, data, fileName, sheetName = 'Data') {
  cleanupOldFiles();
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Roomac CRM';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(sheetName);
  
  // Define columns based on data type
  if (data.length > 0 && data[0].value !== undefined) {
    // Values data structure
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Value', key: 'value', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created Date', key: 'created_at', width: 20 }
    ];
    
    data.forEach(item => {
      worksheet.addRow({
        id: item.id,
        value: item.value,
        status: item.is_active ? 'Active' : 'Inactive',
        created_at: new Date(item.created_at)
      });
    });
  } else {
    // Types data structure
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Type Name', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created Date', key: 'created_at', width: 20 }
    ];
    
    data.forEach(item => {
      worksheet.addRow({
        id: item.id,
        name: item.name,
        status: item.is_active ? 'Active' : 'Inactive',
        created_at: new Date(item.created_at)
      });
    });
  }

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2C5282' }
  };

  // Auto filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length }
  };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}-${Date.now()}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

async function exportAsCSV(res, data, fileName, sheetName = 'Data') {
  let csvContent = '';
  
  if (data.length > 0 && data[0].value !== undefined) {
    // Values CSV
    csvContent = 'ID,Value,Status,Created Date\n';
    data.forEach(item => {
      csvContent += `${item.id},"${item.value.replace(/"/g, '""')}",${item.is_active ? 'Active' : 'Inactive'},"${new Date(item.created_at).toLocaleDateString()}"\n`;
    });
  } else {
    // Types CSV
    csvContent = 'ID,Type Name,Status,Created Date\n';
    data.forEach(item => {
      csvContent += `${item.id},"${item.name.replace(/"/g, '""')}",${item.is_active ? 'Active' : 'Inactive'},"${new Date(item.created_at).toLocaleDateString()}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}-${Date.now()}.csv"`
  );
  res.send(csvContent);
}