// controllers/monthlyRentController.js
const monthlyRentCron = require('../utils/monthlyRentCron');

const monthlyRentController = {
  
  // Manually trigger monthly rent creation
  async triggerMonthlyCreation(req, res) {
    try {
      const result = await monthlyRentCron.createMonthlyRentRecords();
      
      res.status(200).json({
        success: result.success,
        message: result.success ? 'Monthly rent records created successfully' : 'Failed to create records',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // Backfill missing months for a tenant
  async backfillTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const result = await monthlyRentCron.backfillTenantMonths(parseInt(tenantId));
      
      res.status(200).json({
        success: result.success,
        message: result.success ? 'Tenant months backfilled successfully' : 'Failed to backfill',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // Backfill all tenants
  async backfillAllTenants(req, res) {
    try {
      const [tenants] = await db.execute(`
        SELECT id FROM tenants WHERE status = 'active' AND is_active = 1
      `);
      
      const results = [];
      for (const tenant of tenants) {
        const result = await monthlyRentCron.backfillTenantMonths(tenant.id);
        results.push(result);
      }
      
      const totalCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
      
      res.status(200).json({
        success: true,
        message: `Backfill completed: ${totalCreated} records created`,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // Sync monthly rent with payments
  async syncMonthlyRent(req, res) {
    try {
      const result = await monthlyRentCron.syncMonthlyRentWithPayments();
      
      res.status(200).json({
        success: result.success,
        message: result.success ? 'Sync completed successfully' : 'Sync failed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // Get tenant's monthly rent history
  async getTenantMonthlyHistory(req, res) {
    try {
      const { tenantId } = req.params;
      
      const [records] = await db.execute(`
        SELECT 
          id,
          month,
          year,
          rent,
          paid,
          balance,
          discount,
          status,
          created_at,
          updated_at
        FROM monthly_rent
        WHERE tenant_id = ?
        ORDER BY STR_TO_DATE(CONCAT(year, '-', MONTH(STR_TO_DATE(month, '%M'))), '%Y-%m') ASC
      `, [tenantId]);
      
      res.status(200).json({
        success: true,
        data: records
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = monthlyRentController;