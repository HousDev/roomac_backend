// services/monthlyRentCron.js
const db = require("../config/db");
const cron = require('node-cron');

class MonthlyRentCron {
  
  // Main function to create monthly rent records
// utils/monthlyRentCron.js - Updated createMonthlyRentRecords function

// utils/monthlyRentCron.js - Updated createMonthlyRentRecords

async createMonthlyRentRecords() {
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  
  console.log(`🔄 Running monthly rent cron job for ${currentMonth} ${currentYear}`);
  
  try {
    // Only get active tenants with valid check_in_date (DATE column - just check for NOT NULL)
    const [activeTenants] = await db.execute(`
      SELECT 
        t.id as tenant_id,
        t.check_in_date,
        ba.tenant_rent as monthly_rent,
        ba.created_at as assignment_date,
        ba.room_id,
        r.property_id,
        b.id as booking_id,
        b.offer_code,
        b.discount_amount,
        b.monthly_rent as discounted_monthly_rent
      FROM tenants t
      INNER JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      INNER JOIN rooms r ON ba.room_id = r.id
      LEFT JOIN bookings b ON t.id = b.tenant_id AND b.status = 'active'
      WHERE t.status = 'active'
        AND t.is_active = 1
        AND t.check_in_date IS NOT NULL
    `);
    
    console.log(`Found ${activeTenants.length} active tenants with check_in_date`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const tenant of activeTenants) {
      try {
        // Skip if check_in_date is invalid
        if (!tenant.check_in_date || tenant.check_in_date === '0000-00-00') {
          console.log(`⏭️ Skipping tenant ${tenant.tenant_id} - invalid check_in_date`);
          skipped++;
          continue;
        }
        
        const checkInDate = new Date(tenant.check_in_date);
        const currentDate = new Date();
        
        // Only create record if check_in_date is on or before current month
        if (checkInDate > currentDate) {
          console.log(`⏭️ Skipping tenant ${tenant.tenant_id} - check_in_date (${tenant.check_in_date}) is in future`);
          skipped++;
          continue;
        }
        
        const shouldCreate = await this.shouldCreateRecordForMonth(
          tenant.tenant_id,
          currentMonth,
          currentYear
        );
        
        if (!shouldCreate) {
          skipped++;
          continue;
        }
        
        // Calculate rent amount (apply first month discount if applicable)
        let rentAmount = parseFloat(tenant.monthly_rent);
        let discountAmount = 0;
        let isDiscounted = false;
        
        // Check if this is the first month for this tenant
        const isFirstMonth = await this.isFirstMonthForTenant(
          tenant.tenant_id,
          currentMonthNum,
          currentYear
        );
        
        if (isFirstMonth && tenant.offer_code) {
          if (tenant.discounted_monthly_rent && tenant.discounted_monthly_rent < tenant.monthly_rent) {
            rentAmount = parseFloat(tenant.discounted_monthly_rent);
            discountAmount = tenant.monthly_rent - rentAmount;
            isDiscounted = true;
          } else if (tenant.discount_amount && tenant.discount_amount > 0) {
            discountAmount = parseFloat(tenant.discount_amount);
            rentAmount = Math.max(0, tenant.monthly_rent - discountAmount);
            isDiscounted = true;
          }
        }
        
        // Create the monthly rent record
        await db.execute(`
          INSERT INTO monthly_rent (
            tenant_id,
            month,
            year,
            rent,
            paid,
            balance,
            discount,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          tenant.tenant_id,
          currentMonth,
          currentYear,
          rentAmount,
          0,
          rentAmount,
          discountAmount,
          'pending'
        ]);
        
        created++;
        console.log(`✅ Created rent record for tenant ${tenant.tenant_id} - ${currentMonth} ${currentYear}${isDiscounted ? ' (Discounted)' : ''}`);
        
      } catch (error) {
        console.error(`❌ Error creating record for tenant ${tenant.tenant_id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`📊 Monthly rent cron completed: ${created} created, ${skipped} skipped, ${errors} errors`);
    
    return {
      success: true,
      created,
      skipped,
      errors,
      month: currentMonth,
      year: currentYear
    };
    
  } catch (error) {
    console.error("❌ Monthly rent cron failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
  
  // Check if a record already exists for this tenant in the given month
  async shouldCreateRecordForMonth(tenantId, month, year) {
    const [existing] = await db.execute(`
      SELECT id FROM monthly_rent 
      WHERE tenant_id = ? AND month = ? AND year = ?
    `, [tenantId, month, year]);
    
    return existing.length === 0;
  }
  
  // Check if this is the first month for the tenant
  async isFirstMonthForTenant(tenantId, currentMonthNum, currentYear) {
    // Get tenant's check-in date
    const [tenant] = await db.execute(`
      SELECT check_in_date, created_at FROM tenants WHERE id = ?
    `, [tenantId]);
    
    if (!tenant.length) return false;
    
    const checkInDate = new Date(tenant[0].check_in_date || tenant[0].created_at);
    const checkInMonth = checkInDate.getMonth() + 1;
    const checkInYear = checkInDate.getFullYear();
    
    // Check if there are any existing rent records
    const [existingRecords] = await db.execute(`
      SELECT COUNT(*) as count FROM monthly_rent WHERE tenant_id = ?
    `, [tenantId]);
    
    // If no records exist, this should be the first month
    if (existingRecords[0].count === 0) {
      return true;
    }
    
    // Check if this month matches the check-in month/year
    return (currentMonthNum === checkInMonth && currentYear === checkInYear);
  }
  
  // Backfill missing months for a specific tenant
// utils/monthlyRentCron.js - Updated backfillTenantMonths function

async backfillTenantMonths(tenantId) {
  console.log(`🔄 Backfilling months for tenant ${tenantId}`);
  
  try {
    // Get tenant details with check_in_date validation
    const [tenant] = await db.execute(`
      SELECT 
        t.id,
        t.check_in_date,
        t.full_name,
        ba.tenant_rent as monthly_rent,
        b.offer_code,
        b.discount_amount,
        b.monthly_rent as discounted_monthly_rent
      FROM tenants t
      LEFT JOIN bed_assignments ba ON t.id = ba.tenant_id AND ba.is_available = 0
      LEFT JOIN bookings b ON t.id = b.tenant_id AND b.status = 'active'
      WHERE t.id = ?
    `, [tenantId]);
    
    if (!tenant.length) {
      return { 
        success: false, 
        error: "Tenant not found",
        skipped: true,
        message: "Tenant not found"
      };
    }
    
    // Check if check_in_date exists and is valid
    const checkInDateRaw = tenant[0].check_in_date;
    
    if (!checkInDateRaw || checkInDateRaw === '0000-00-00') {
      console.log(`⚠️ Tenant ${tenantId} (${tenant[0].full_name}) has no valid check_in_date, skipping...`);
      return { 
        success: true, 
        created: 0,
        skipped: true,
        message: "No valid check_in_date assigned"
      };
    }
    
    const checkInDate = new Date(checkInDateRaw);
    const currentDate = new Date();
    const monthlyRent = parseFloat(tenant[0].monthly_rent);
    
    // Validate check_in_date is valid
    if (isNaN(checkInDate.getTime())) {
      console.log(`⚠️ Tenant ${tenantId} has invalid check_in_date: ${checkInDateRaw}`);
      return { 
        success: true, 
        created: 0,
        skipped: true,
        message: "Invalid check_in_date format"
      };
    }
    
    let created = 0;
    let tempDate = new Date(checkInDate);
    
    while (tempDate <= currentDate) {
      const monthName = tempDate.toLocaleString('default', { month: 'long' });
      const year = tempDate.getFullYear();
      
      // Check if record exists
      const [existing] = await db.execute(`
        SELECT id FROM monthly_rent 
        WHERE tenant_id = ? AND month = ? AND year = ?
      `, [tenantId, monthName, year]);
      
      if (existing.length === 0) {
        // Calculate rent (first month discount)
        let rentAmount = monthlyRent;
        let discountAmount = 0;
        let isFirstMonth = (tempDate.getMonth() === checkInDate.getMonth() && 
                           tempDate.getFullYear() === checkInDate.getFullYear());
        
        if (isFirstMonth && tenant[0].offer_code) {
          if (tenant[0].discounted_monthly_rent && tenant[0].discounted_monthly_rent < monthlyRent) {
            rentAmount = parseFloat(tenant[0].discounted_monthly_rent);
            discountAmount = monthlyRent - rentAmount;
          } else if (tenant[0].discount_amount && tenant[0].discount_amount > 0) {
            discountAmount = parseFloat(tenant[0].discount_amount);
            rentAmount = Math.max(0, monthlyRent - discountAmount);
          }
        }
        
        // Get payments for this specific month from payments table
        const [monthPayments] = await db.execute(`
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments 
          WHERE tenant_id = ? 
            AND payment_type = 'rent'
            AND month = ?
            AND year = ?
            AND status = 'approved'
        `, [tenantId, monthName, year]);
        
        const paidAmount = parseFloat(monthPayments[0].total_paid);
        const balance = Math.max(0, rentAmount - paidAmount);
        const status = paidAmount >= rentAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');
        
        await db.execute(`
          INSERT INTO monthly_rent (
            tenant_id, month, year, rent, paid, balance, discount, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [tenantId, monthName, year, rentAmount, paidAmount, balance, discountAmount, status]);
        
        created++;
        console.log(`   ✅ Created record for ${monthName} ${year} - Rent: ₹${rentAmount}`);
      }
      
      tempDate.setMonth(tempDate.getMonth() + 1);
    }
    
    console.log(`📊 Backfill completed for tenant ${tenantId}: ${created} records created`);
    
    return {
      success: true,
      created,
      tenant_id: tenantId,
      tenant_name: tenant[0].full_name,
      check_in_date: checkInDateRaw
    };
    
  } catch (error) {
    console.error(`❌ Backfill failed for tenant ${tenantId}:`, error);
    return {
      success: false,
      error: error.message,
      skipped: true
    };
  }
}
  
  // Update existing monthly rent records with payment information
  async syncMonthlyRentWithPayments() {
    console.log(`🔄 Syncing monthly_rent table with payments...`);
    
    try {
      // Get all monthly_rent records
      const [records] = await db.execute(`
        SELECT id, tenant_id, month, year FROM monthly_rent
      `);
      
      let updated = 0;
      
      for (const record of records) {
        // Get total approved payments for this month
        const [payments] = await db.execute(`
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments 
          WHERE tenant_id = ? 
            AND payment_type = 'rent'
            AND month = ?
            AND year = ?
            AND status = 'approved'
        `, [record.tenant_id, record.month, record.year]);
        
        const paidAmount = parseFloat(payments[0].total_paid);
        
        // Get the rent amount from the record
        const [rentRecord] = await db.execute(`
          SELECT rent, discount FROM monthly_rent WHERE id = ?
        `, [record.id]);
        
        if (rentRecord.length) {
          const rentAmount = parseFloat(rentRecord[0].rent);
          const balance = Math.max(0, rentAmount - paidAmount);
          const status = paidAmount >= rentAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');
          
          await db.execute(`
            UPDATE monthly_rent 
            SET paid = ?, balance = ?, status = ?, updated_at = NOW()
            WHERE id = ?
          `, [paidAmount, balance, status, record.id]);
          
          updated++;
        }
      }
      
      console.log(`✅ Sync completed: ${updated} records updated`);
      
      return {
        success: true,
        updated
      };
      
    } catch (error) {
      console.error("❌ Sync failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MonthlyRentCron();