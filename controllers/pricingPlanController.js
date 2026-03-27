  // controllers/pricingPlanController.js
  const PricingPlanModel = require("../models/pricingPlanModel");

  // ── Pricing Plans ─────────────────────────────────────────────

  exports.getAll = async (req, res) => {
    try {
      const { property_id } = req.query;
      const plans = await PricingPlanModel.findAll(property_id || null);
      res.json({ success: true, data: plans });
    } catch (err) {
      console.error("getAll pricing plans:", err);
      res.status(500).json({ success: false, message: "Failed to fetch pricing plans" });
    }
  };

  exports.getPaginated = async (req, res) => {
    try {
      const page   = parseInt(req.query.page)  || 1;
      const limit  = parseInt(req.query.limit) || 10;
      const search      = req.query.search      || "";
      const property_id = req.query.property_id || "all";
      const is_active   = req.query.is_active !== undefined
        ? req.query.is_active === "true"
        : undefined;
      const type = req.query.type || "all"; // "regular", "short_stay", "all"

      const filters = { search, property_id, is_active, type };
      const [data, total] = await Promise.all([
        PricingPlanModel.findAllWithPagination(page, limit, filters),
        PricingPlanModel.getTotalCount(filters),
      ]);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
      });
    } catch (err) {
      console.error("getPaginated pricing plans:", err);
      res.status(500).json({ success: false, message: "Failed to fetch pricing plans" });
    }
  };

  exports.getById = async (req, res) => {
    try {
      const plan = await PricingPlanModel.findById(req.params.id);
      if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
      res.json({ success: true, data: plan });
    } catch (err) {
      console.error("getById pricing plan:", err);
      res.status(500).json({ success: false, message: "Failed to fetch plan" });
    }
  };

  exports.create = async (req, res) => {
    try {
      const { name, duration, total_price } = req.body;
      if (!name || !duration || total_price === undefined) {
        return res.status(400).json({ success: false, message: "name, duration, and total_price are required" });
      }
      const result = await PricingPlanModel.create(req.body);
      res.status(201).json({ success: true, message: "Pricing plan created", id: result.id });
    } catch (err) {
      console.error("create pricing plan:", err);
      res.status(500).json({ success: false, message: "Failed to create pricing plan" });
    }
  };

  exports.update = async (req, res) => {
    try {
      const plan = await PricingPlanModel.findById(req.params.id);
      if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
      await PricingPlanModel.update(req.params.id, req.body);
      res.json({ success: true, message: "Pricing plan updated" });
    } catch (err) {
      console.error("update pricing plan:", err);
      res.status(500).json({ success: false, message: "Failed to update pricing plan" });
    }
  };

  exports.remove = async (req, res) => {
    try {
      await PricingPlanModel.delete(req.params.id);
      res.json({ success: true, message: "Pricing plan deleted" });
    } catch (err) {
      console.error("delete pricing plan:", err);
      res.status(500).json({ success: false, message: "Failed to delete pricing plan" });
    }
  };

  exports.toggleActive = async (req, res) => {
    try {
      const { is_active } = req.body;
      const plan = await PricingPlanModel.findById(req.params.id);
      if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
      await PricingPlanModel.toggleActive(req.params.id, is_active);
      res.json({ success: true, message: "Status updated", is_active });
    } catch (err) {
      console.error("toggle pricing plan:", err);
      res.status(500).json({ success: false, message: "Failed to update status" });
    }
  };

  // ── Short Stay Banner (now uses same table) ─────────────────

  exports.getShortStayBanner = async (req, res) => {
    try {
      const { property_id } = req.query;
      const banner = await PricingPlanModel.getShortStayBanner(property_id || null);
      res.json({ success: true, data: banner });
    } catch (err) {
      console.error("getShortStayBanner:", err);
      res.status(500).json({ success: false, message: "Failed to fetch banner" });
    }
  };

  exports.upsertShortStayBanner = async (req, res) => {
    try {
      const { label, rate_per_day } = req.body;
      if (!rate_per_day) {
        return res.status(400).json({ success: false, message: "rate_per_day is required" });
      }
      const result = await PricingPlanModel.upsertShortStayBanner(req.body);
      res.json({ success: true, message: "Banner saved", id: result.id });
    } catch (err) {
      console.error("upsertShortStayBanner:", err);
      res.status(500).json({ success: false, message: "Failed to save banner" });
    }
  };

  exports.healthCheck = (req, res) => {
    res.json({ status: "OK", message: "Pricing Plans API is working", timestamp: new Date().toISOString() });
  };