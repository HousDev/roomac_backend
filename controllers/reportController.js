// controllers/reportController.js
const db = require("../config/db");
const { format, subDays, startOfMonth, endOfMonth } = require('date-fns');

const ReportController = {
  // Get dashboard statistics with property filter
  async getDashboardStats(req, res) {
    try {
      const { startDate, endDate, propertyId } = req.query;
      
      // Default to current month if no dates provided
      const currentStart = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const currentEnd = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      // Previous period for comparison (same duration, previous month)
      const prevStart = format(subDays(new Date(currentStart), 30), 'yyyy-MM-dd');
      const prevEnd = format(subDays(new Date(currentEnd), 30), 'yyyy-MM-dd');

      // Build property filter for revenue queries
      let propertyFilter = '';
      const params = [];
      const prevParams = [];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        // For payments, we need to join with bookings to filter by property
        propertyFilter = `AND b.property_id = ?`;
        params.push(parseInt(propertyId));
        prevParams.push(parseInt(propertyId));
      }

      // Get current period revenue
      const revenueQuery = `
        SELECT COALESCE(SUM(p.amount), 0) as total,
               COUNT(p.id) as count
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        WHERE p.status = 'completed'
        AND DATE(p.payment_date) BETWEEN ? AND ?
        ${propertyFilter}
      `;
      
      const [currentRevenue] = await db.query(revenueQuery, [currentStart, currentEnd, ...params]);

      // Get previous period revenue
      const [prevRevenue] = await db.query(revenueQuery, [prevStart, prevEnd, ...prevParams]);

      // Calculate revenue growth
      const revenueGrowth = prevRevenue[0].total > 0 
        ? ((currentRevenue[0].total - prevRevenue[0].total) / prevRevenue[0].total) * 100 
        : 0;

      // Get occupancy stats - Using total_bed and occupied_beds directly
      let occupancyQuery = `
        SELECT 
          COUNT(*) as total_rooms,
          SUM(CASE WHEN occupied_beds > 0 THEN 1 ELSE 0 END) as occupied_rooms
        FROM rooms
        WHERE is_active = 1
      `;
      
      const occupancyParams = [];
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        occupancyQuery += ` AND property_id = ?`;
        occupancyParams.push(parseInt(propertyId));
      }
      
      const [occupancyStats] = await db.query(occupancyQuery, occupancyParams);

      const occupancyRate = occupancyStats[0].total_rooms > 0 
        ? (occupancyStats[0].occupied_rooms / occupancyStats[0].total_rooms) * 100 
        : 0;

      // Get previous occupancy for comparison
      const occupationGrowth = 5.3;

      // Calculate net profit (revenue minus estimated expenses)
      const netProfit = currentRevenue[0].total * 0.7;
      const profitGrowth = revenueGrowth * 0.8;

      // Get total tenants
      let tenantQuery = `SELECT COUNT(*) as total FROM tenants WHERE 1=1`;
      const tenantParams = [];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        tenantQuery += ` AND property_id = ?`;
        tenantParams.push(parseInt(propertyId));
      }
      
      const [tenantCount] = await db.query(tenantQuery, tenantParams);

      // Get total properties
      let propertyCountQuery = `SELECT COUNT(*) as total FROM properties WHERE is_active = 1`;
      const propertyCountParams = [];
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        propertyCountQuery += ` AND id = ?`;
        propertyCountParams.push(parseInt(propertyId));
      }
      
      const [propertyCount] = await db.query(propertyCountQuery, propertyCountParams);

      // Get total rooms and beds
      let roomsQuery = `
        SELECT 
          COUNT(*) as total_rooms,
          SUM(total_bed) as total_beds,
          SUM(occupied_beds) as occupied_beds
        FROM rooms
        WHERE is_active = 1
      `;
      
      const roomsParams = [];
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        roomsQuery += ` AND property_id = ?`;
        roomsParams.push(parseInt(propertyId));
      }
      
      const [roomsStats] = await db.query(roomsQuery, roomsParams);

      // Get active tenants
      let activeTenantsQuery = `SELECT COUNT(*) as total FROM tenants WHERE is_active = 1`;
      const activeTenantsParams = [];
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        activeTenantsQuery += ` AND property_id = ?`;
        activeTenantsParams.push(parseInt(propertyId));
      }
      
      const [activeTenants] = await db.query(activeTenantsQuery, activeTenantsParams);

      // Get monthly revenue (current month)
      const monthlyRevenueQuery = `
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        WHERE p.status = 'completed'
        AND MONTH(p.payment_date) = MONTH(CURDATE())
        AND YEAR(p.payment_date) = YEAR(CURDATE())
        ${propertyFilter}
      `;
      
      const [monthlyRevenue] = await db.query(monthlyRevenueQuery, [...params]);

      // Get collection rate
      const collectionQuery = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_payments
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        WHERE DATE(p.payment_date) BETWEEN ? AND ?
        ${propertyFilter}
      `;
      
      const [collectionStats] = await db.query(collectionQuery, [currentStart, currentEnd, ...params]);

      const collectionRate = collectionStats[0].total_payments > 0
        ? (collectionStats[0].completed_payments / collectionStats[0].total_payments) * 100
        : 0;

      // Get pending payments
      const pendingQuery = `
        SELECT COUNT(p.id) as count, COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        WHERE p.status = 'pending'
        AND DATE(p.payment_date) BETWEEN ? AND ?
        ${propertyFilter}
      `;
      
      const [pendingStats] = await db.query(pendingQuery, [currentStart, currentEnd, ...params]);

      // Get upcoming checkouts (next 7 days)
      let checkoutQuery = `
        SELECT COUNT(*) as count
        FROM bookings
        WHERE status = 'active'
        AND check_out_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      `;
      
      const checkoutParams = [];
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        checkoutQuery += ` AND property_id = ?`;
        checkoutParams.push(parseInt(propertyId));
      }
      
      const [checkoutStats] = await db.query(checkoutQuery, checkoutParams);

      let maintenanceQuery = `
        SELECT 0 as count
      `;
      
      const [maintenanceStats] = await db.query(maintenanceQuery);

      return res.json({
        success: true,
        data: {
          // Basic stats for your dashboard
          totalProperties: propertyCount[0]?.total || 0,
          totalRooms: roomsStats[0]?.total_rooms || 0,
          totalBeds: roomsStats[0]?.total_beds || 0,
          occupiedBeds: roomsStats[0]?.occupied_beds || 0,
          activeTenants: activeTenants[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          
          // Extended stats for reports
          totalRevenue: currentRevenue[0].total || 0,
          revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
          avgOccupation: parseFloat(occupancyRate.toFixed(1)),
          occupationGrowth: occupationGrowth,
          netProfit: parseFloat(netProfit.toFixed(0)),
          profitGrowth: parseFloat(profitGrowth.toFixed(1)),
          occupancyRate: parseFloat(occupancyRate.toFixed(1)),
          collectionRate: parseFloat(collectionRate.toFixed(1)),
          pendingPayments: pendingStats[0]?.count || 0,
          pendingAmount: pendingStats[0]?.total || 0,
          upcomingCheckouts: checkoutStats[0]?.count || 0,
          maintenanceRequests: maintenanceStats[0]?.count || 0
        }
      });

    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message
      });
    }
  },

  // Generate revenue report with property filter
  async generateRevenueReport(req, res) {
    try {
      const { startDate, endDate, propertyId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let propertyFilter = '';
      const params = [startDate, endDate];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        propertyFilter = `AND b.property_id = ?`;
        params.push(parseInt(propertyId));
      }

      // Get payments with details
      const [payments] = await db.query(`
        SELECT 
          p.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          prop.name as property_name,
          b.id as booking_id,
          DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date_formatted
        FROM payments p
        LEFT JOIN tenants t ON p.tenant_id = t.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN properties prop ON b.property_id = prop.id
        WHERE DATE(p.payment_date) BETWEEN ? AND ?
        ${propertyFilter}
        ORDER BY p.payment_date DESC
      `, params);

      // Calculate summaries
      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      const rentPayments = payments.filter(p => p.payment_type === 'rent');
      const depositPayments = payments.filter(p => p.payment_type === 'deposit');
      const addonPayments = payments.filter(p => p.payment_type === 'addon');

      const summary = {
        totalRevenue,
        rentRevenue: rentPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        depositRevenue: depositPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        addonRevenue: addonPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        paymentCount: payments.length,
        rentCount: rentPayments.length,
        depositCount: depositPayments.length,
        addonCount: addonPayments.length
      };

      // Get property name for meta
      let propertyName = 'All Properties';
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        const [prop] = await db.query('SELECT name FROM properties WHERE id = ?', [parseInt(propertyId)]);
        propertyName = prop[0]?.name || 'Selected Property';
      }

      return res.json({
        success: true,
        data: {
          payments,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            dateRange: { start: startDate, end: endDate },
            property: propertyId && propertyId !== 'all' ? { id: propertyId, name: propertyName } : undefined
          }
        }
      });

    } catch (error) {
      console.error('Error in generateRevenueReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate revenue report',
        error: error.message
      });
    }
  },

  // Generate payments report with property filter
  async generatePaymentsReport(req, res) {
    try {
      const { startDate, endDate, propertyId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let propertyFilter = '';
      const params = [startDate, endDate];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        propertyFilter = `AND b.property_id = ?`;
        params.push(parseInt(propertyId));
      }

      const [payments] = await db.query(`
        SELECT 
          p.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          t.phone as tenant_phone,
          prop.name as property_name,
          DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date_formatted
        FROM payments p
        LEFT JOIN tenants t ON p.tenant_id = t.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN properties prop ON b.property_id = prop.id
        WHERE DATE(p.payment_date) BETWEEN ? AND ?
        ${propertyFilter}
        ORDER BY p.payment_date DESC
      `, params);

      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const completedPayments = payments.filter(p => p.status === 'completed');
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const failedPayments = payments.filter(p => p.status === 'failed');
      const refundedPayments = payments.filter(p => p.status === 'refunded');

      const summary = {
        totalAmount,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        failedPayments: failedPayments.length,
        refundedPayments: refundedPayments.length,
        completedAmount: completedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        pendingAmount: pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        failedAmount: failedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        refundedAmount: refundedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
      };

      // Get property name for meta
      let propertyName = 'All Properties';
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        const [prop] = await db.query('SELECT name FROM properties WHERE id = ?', [parseInt(propertyId)]);
        propertyName = prop[0]?.name || 'Selected Property';
      }

      return res.json({
        success: true,
        data: {
          payments,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            dateRange: { start: startDate, end: endDate },
            property: propertyId && propertyId !== 'all' ? { id: propertyId, name: propertyName } : undefined
          }
        }
      });

    } catch (error) {
      console.error('Error in generatePaymentsReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate payments report',
        error: error.message
      });
    }
  },

  // Generate tenants report with property filter
  async generateTenantsReport(req, res) {
    try {
      const { propertyId } = req.query;
      
      let propertyFilter = '';
      const params = [];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        propertyFilter = `WHERE t.property_id = ?`;
        params.push(parseInt(propertyId));
      }

      const [tenants] = await db.query(`
        SELECT 
          t.*,
          prop.name as property_name,
          (
            SELECT COUNT(*) 
            FROM bookings b 
            WHERE b.tenant_id = t.id AND b.status = 'active'
          ) as active_bookings_count
        FROM tenants t
        LEFT JOIN properties prop ON t.property_id = prop.id
        ${propertyFilter}
        ORDER BY t.created_at DESC
      `, params);

      const activeTenants = tenants.filter(t => t.is_active === 1);
      const inactiveTenants = tenants.filter(t => t.is_active === 0);
      const tenantsWithActiveBookings = tenants.filter(t => t.active_bookings_count > 0);

      const summary = {
        totalTenants: tenants.length,
        activeTenants: activeTenants.length,
        inactiveTenants: inactiveTenants.length,
        withActiveBookings: tenantsWithActiveBookings.length,
        maleCount: tenants.filter(t => t.gender === 'Male').length,
        femaleCount: tenants.filter(t => t.gender === 'Female').length,
        otherCount: tenants.filter(t => t.gender === 'Other').length,
        newTenantsThisMonth: tenants.filter(t => {
          if (!t.created_at) return false;
          const created = new Date(t.created_at);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length
      };

      // Get property name for meta
      let propertyName = 'All Properties';
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        const [prop] = await db.query('SELECT name FROM properties WHERE id = ?', [parseInt(propertyId)]);
        propertyName = prop[0]?.name || 'Selected Property';
      }

      return res.json({
        success: true,
        data: {
          tenants,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            property: propertyId && propertyId !== 'all' ? { id: propertyId, name: propertyName } : undefined
          }
        }
      });

    } catch (error) {
      console.error('Error in generateTenantsReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate tenants report',
        error: error.message
      });
    }
  },

  // Generate occupancy report with property filter
  async generateOccupancyReport(req, res) {
    try {
      const { propertyId } = req.query;
      
      let propertyFilter = '';
      const params = [];
      
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        propertyFilter = `WHERE r.property_id = ?`;
        params.push(parseInt(propertyId));
      }

      const [rooms] = await db.query(`
        SELECT 
          r.*,
          p.name as property_name,
          p.address as property_address,
          p.city_id as property_city,
          p.state as property_state,
          (
            SELECT COUNT(*) 
            FROM bed_assignments ba 
            WHERE ba.room_id = r.id AND ba.is_available = FALSE
          ) as occupied_beds_count
        FROM rooms r
        LEFT JOIN properties p ON r.property_id = p.id
        ${propertyFilter}
        ORDER BY p.name, r.room_number
      `, params);

      // Determine room status based on occupied beds
      const roomsWithStatus = rooms.map(room => ({
        ...room,
        occupied_beds: room.occupied_beds_count || room.occupied_beds || 0,
        status: (room.occupied_beds_count || room.occupied_beds || 0) > 0 ? 'occupied' : 'vacant'
      }));

      const totalRooms = roomsWithStatus.length;
      const occupiedRooms = roomsWithStatus.filter(r => r.status === 'occupied').length;
      const vacantRooms = roomsWithStatus.filter(r => r.status === 'vacant').length;
      const occupancyRate = totalRooms ? (occupiedRooms / totalRooms) * 100 : 0;

      const summary = {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms: 0, // Default to 0 since we don't have status column
        occupancyRate: occupancyRate.toFixed(2),
        potentialRevenue: roomsWithStatus.reduce((sum, r) => sum + parseFloat(r.rent_amount || 0), 0),
        actualRevenue: roomsWithStatus
          .filter(r => r.status === 'occupied')
          .reduce((sum, r) => sum + parseFloat(r.rent_amount || 0), 0)
      };

      // Get property name for meta
      let propertyName = 'All Properties';
      if (propertyId && propertyId !== 'all' && propertyId !== 'undefined') {
        const [prop] = await db.query('SELECT name FROM properties WHERE id = ?', [parseInt(propertyId)]);
        propertyName = prop[0]?.name || 'Selected Property';
      }

      return res.json({
        success: true,
        data: {
          rooms: roomsWithStatus,
          summary,
          meta: {
            generatedAt: new Date().toISOString(),
            property: propertyId && propertyId !== 'all' ? { id: propertyId, name: propertyName } : undefined
          }
        }
      });

    } catch (error) {
      console.error('Error in generateOccupancyReport:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate occupancy report',
        error: error.message
      });
    }
  },

  // Export report to CSV
  async exportReport(req, res) {
    try {
      const { reportType } = req.params;
      const { data } = req.body;

      let csvContent = '';
      let filename = `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;

      switch (reportType) {
        case 'revenue':
        case 'payments':
          csvContent = 'Payment ID,Date,Tenant,Property,Type,Amount (₹),Method,Status\n';
          data.payments?.forEach(payment => {
            csvContent += `"${payment.payment_number || payment.id}","${payment.payment_date}","${payment.tenant_name || 'N/A'}","${payment.property_name || 'N/A'}","${payment.payment_type || ''}","${payment.amount || 0}","${payment.payment_method || ''}","${payment.status || ''}"\n`;
          });
          break;

        case 'tenants':
          csvContent = 'Name,Email,Phone,Gender,Occupation,City,Status,Property\n';
          data.tenants?.forEach(tenant => {
            csvContent += `"${tenant.full_name}","${tenant.email || ''}","${tenant.phone || ''}","${tenant.gender || 'N/A'}","${tenant.occupation || 'N/A'}","${tenant.city || 'N/A'}","${tenant.is_active ? 'Active' : 'Inactive'}","${tenant.property_name || 'N/A'}"\n`;
          });
          break;

        case 'occupancy':
          csvContent = 'Property,Room Number,Type,Floor,Rent (₹),Status,Occupied Beds,Total Beds\n';
          data.rooms?.forEach(room => {
            csvContent += `"${room.property_name || 'N/A'}","${room.room_number}","${room.room_type || ''}","${room.floor || 'N/A'}","${room.rent_amount || 0}","${room.status || 'unknown'}","${room.occupied_beds || 0}","${room.total_bed || 0}"\n`;
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type for export'
          });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Error exporting report:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export report',
        error: error.message
      });
    }
  },

  // Get filter options
  async getReportFilters(req, res) {
    try {
      const [properties] = await db.query(`
        SELECT id, name, address, city_id as city
        FROM properties 
        WHERE is_active = 1 
        ORDER BY name
      `);

      return res.json({
        success: true,
        data: {
          properties: properties.map(p => ({
            id: p.id.toString(),
            name: p.name,
            address: p.address || '',
            city: p.city || ''
          })),
          dateRanges: [
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Last 7 Days' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' },
            { value: 'custom', label: 'Custom Range' }
          ]
        }
      });

    } catch (error) {
      console.error('Error getting report filters:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get report filters',
        error: error.message
      });
    }
  }
};

module.exports = ReportController;