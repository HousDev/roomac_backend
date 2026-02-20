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

exports.getAll = async (req, res) => {
  try {
    const rows = await model.getAllMasters();

      // Transform flat SQL into nested structure
      const result = {};

      rows.forEach((r) => {
        if (!result[r.tab_name]) {
          result[r.tab_name] = [];
        }

        let item = result[r.tab_name].find(
          (i) => i.id === r.item_id
        );

        if (!item && r.item_id) {
          item = {
            id: r.item_id,
            name: r.item_name,
            values: []
          };
          result[r.tab_name].push(item);
        }

        if (item && r.value_id) {
          item.values.push({
            id: r.value_id,
            name: r.value_name
          });
        }
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("MasterController.getAll error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch masters"
      });
    }
  },

  // Get items by tab_id
  exports.getByTabId = async (req, res) => {
    try {
      const { tab_id } = req.params;
      const items = await model.getItemsByTabId(tab_id);

      return res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error("MasterController.getByTabId error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch master items"
      });
    }
  }

  // controllers/master.controller.js
exports.getMasterValues = async (req, res) => {
  const { tab, item } = req.query;

  if (!tab || !item) {
    return res.status(400).json({ message: "tab and item are required" });
  }

  const [rows] = await db.query(
    `
    SELECT miv.id, miv.name
    FROM master_tabs mt
    JOIN master_items mi ON mi.tab_id = mt.id
    JOIN master_item_values miv ON miv.master_item_id = mi.id
    WHERE mt.tab_name = ?
      AND mi.name = ?
      AND mt.isactive = 1
      AND mi.isactive = 1
      AND miv.isactive = 1
    `,
    [tab, item]
  );

  res.json(rows);
};

exports.consumeMasters = async (req, res) => {
  try {
    const { tab, type } = req.query;

    const rows = await model.consumeMasters({ tab, type });

    // Transform into clean dynamic structure
    const result = {};

    rows.forEach(r => {
      if (!result[r.type_name]) {
        result[r.type_name] = [];
      }

      result[r.type_name].push({
        id: r.value_id,
        name: r.value_name
      });
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("consumeMasters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch master data"
    });
  }
};