// scripts/backfillMonthlyRent.js
const db = require('../config/db');
const monthlyRentCron = require('../utils/monthlyRentCron');

async function backfillAll() {
  console.log('🔄 Starting one-time backfill for all tenants...');
  
  try {
    // Fix: Don't compare DATE column with empty string
    // For DATE columns, empty values are stored as NULL, not empty string
    const [tenants] = await db.execute(`
      SELECT id, full_name, check_in_date 
      FROM tenants 
      WHERE is_active = 1 
        AND check_in_date IS NOT NULL
    `);
    
    console.log(`Found ${tenants.length} active tenants with check_in_date assigned`);
    
    if (tenants.length === 0) {
      console.log('⚠️ No tenants with check_in_date found. Exiting...');
      process.exit(0);
    }
    
    let totalCreated = 0;
    let skippedTenants = 0;
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.full_name} (ID: ${tenant.id})`);
      console.log(`   Check-in date: ${tenant.check_in_date}`);
      
      // Additional validation: check if check_in_date is a valid date
      if (!tenant.check_in_date || tenant.check_in_date === '0000-00-00') {
        console.log(`   ⚠️ Invalid check_in_date, skipping...`);
        skippedTenants++;
        continue;
      }
      
      const result = await monthlyRentCron.backfillTenantMonths(tenant.id);
      
      if (result.created > 0) {
        totalCreated += result.created;
        console.log(`   ✅ Created ${result.created} monthly rent records`);
      } else if (result.skipped) {
        skippedTenants++;
        console.log(`   ⏭️ Skipped: ${result.message || 'No records created'}`);
      } else {
        console.log(`   ℹ️ ${result.message || 'No new records created'}`);
      }
    }
    
    console.log(`\n📊 Backfill Summary:`);
    console.log(`   - Tenants processed: ${tenants.length}`);
    console.log(`   - Tenants skipped: ${skippedTenants}`);
    console.log(`   - Total records created: ${totalCreated}`);
    
    if (totalCreated > 0) {
      // Run sync to update balances
      console.log('\n🔄 Running sync to update balances...');
      await monthlyRentCron.syncMonthlyRentWithPayments();
      console.log('✅ Sync completed!');
    }
    
    console.log('\n✅ All done!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

backfillAll();