// controllers/masterController.js
const model = require("../models/masterModel");

/* ===== TABS ===== */

exports.getTabs = async (req, res) => {
  try {
    res.json({ success: true, data: await model.getTabs() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.createTab = async (req, res) => {
  try {
    const data = await model.createTab(req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.updateTab = async (req, res) => {
  try {
    await model.updateTab(req.params.id, req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.deleteTab = async (req, res) => {
  try {
    await model.deleteTab(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

/* ===== ITEMS ===== */

exports.getItems = async (req, res) => {
  res.json({ success: true, data: await model.getItems() });
};

exports.getItemsByTab = async (req, res) => {
  res.json({
    success: true,
    data: await model.getItemsByTab(req.params.tab_id)
  });
};

exports.createItem = async (req, res) => {
  try {
    res.json({ success: true, data: await model.createItem(req.body) });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.updateItem = async (req, res) => {
  await model.updateItem(req.params.id, req.body);
  res.json({ success: true });
};

exports.deleteItem = async (req, res) => {
  try {
    await model.deleteItem(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

/* ===== VALUES ===== */

exports.getValues = async (req, res) => {
  res.json({
    success: true,
    data: await model.getValues(req.params.item_id)
  });
};

exports.createValue = async (req, res) => {
  try {
    res.json({ success: true, data: await model.createValue(req.body) });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.updateValue = async (req, res) => {
  await model.updateValue(req.params.id, req.body);
  res.json({ success: true });
};

exports.deleteValue = async (req, res) => {
  await model.deleteValue(req.params.id);
  res.json({ success: true });
};

exports.exportMasterItems = async (req, res) => {
  try {
    const data = await model.exportMasterItems();

    const rows = [
      ['Item ID', 'Item Name', 'Tab', 'Status', 'Value Count', 'Created At'],
      ...data.map(i => [
        i.item_id,
        `"${i.item_name}"`,
        i.tab_name,
        i.item_status ? 'Active' : 'Inactive',
        i.value_count,
        new Date(i.created_at).toISOString()
      ])
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=master-items-${Date.now()}.csv`
    );
    res.send(rows.map(r => r.join(',')).join('\n'));

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.exportMasterItemValues = async (req, res) => {
  try {
    const { itemId } = req.params;
    const data = await model.exportMasterItemValues(itemId);

    if (!data.length) {
      return res.status(404).json({
        success: false,
        error: "No values found"
      });
    }

    const rows = [
      ['Value ID', 'Value Name', 'Status', 'Item', 'Tab', 'Created At'],
      ...data.map(v => [
        v.value_id,
        `"${v.value_name}"`,
        v.value_status ? 'Active' : 'Inactive',
        `"${v.item_name}"`,
        v.tab_name,
        new Date(v.created_at).toISOString()
      ])
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=master-values-${Date.now()}.csv`
    );
    res.send(rows.map(r => r.join(',')).join('\n'));

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};