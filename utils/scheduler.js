// cron/scheduler.js
const cron = require('node-cron');
const monthlyRentCron = require('../utils/monthlyRentCron');
const birthdayCron = require('../utils/birthdayCron');

class CronScheduler {
  
  initialize() {

    cron.schedule('0 0 * * *', async () => {
      console.log('🎂 Running birthday cron job...');
      const result = await birthdayCron.sendBirthdayEmails();
      
      if (result.success) {
        console.log(`✅ Birthday cron completed: ${result.sent} emails sent, ${result.failed} failed`);
      } else {
        console.error(`❌ Birthday cron failed: ${result.error}`);
      }
    }, {
      timezone: "Asia/Kolkata"
    });
    
    // Run on the 1st day of every month at 00:00 (midnight)
    cron.schedule('0 0 1 * *', async () => {
      console.log('🔄 Running monthly rent cron job...');
      const result = await monthlyRentCron.createMonthlyRentRecords();
      
      if (result.success) {
        console.log(`✅ Monthly rent cron completed: ${result.created} records created`);
      } else {
        console.error(`❌ Monthly rent cron failed: ${result.error}`);
      }
    }, {
      timezone: "Asia/Kolkata" // IST timezone
    });
    
    // Run sync every day at 02:00 AM to update balances
    cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Running daily sync job...');
      const result = await monthlyRentCron.syncMonthlyRentWithPayments();
      
      if (result.success) {
        console.log(`✅ Daily sync completed: ${result.updated} records updated`);
      } else {
        console.error(`❌ Daily sync failed: ${result.error}`);
      }
    }, {
      timezone: "Asia/Kolkata"
    });
  }
}

module.exports = new CronScheduler();