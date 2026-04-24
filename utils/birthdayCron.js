// utils/birthdayCron.js
const db = require("../config/db");
const { sendEmail } = require("./emailService");
const { getTemplate, replaceVariables } = require("./templateService");

class BirthdayCron {
  
  async sendBirthdayEmails() {
    const now = new Date();

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  month: "2-digit",
  day: "2-digit"
}).formatToParts(now);

const month = parts.find(p => p.type === "month").value;
const day = parts.find(p => p.type === "day").value;

const todayDate = `${month}-${day}`;
    
    console.log(`🎂 Running birthday cron job for ${today.toLocaleDateString()}`);
    
    try {
      // Get tenants with birthday today who are active and not deleted
      const [tenants] = await db.query(`
        SELECT 
          t.id, 
          t.full_name, 
          t.email, 
          t.property_id,
          t.is_active,
          t.date_of_birth
        FROM tenants t
        WHERE DATE_FORMAT(t.date_of_birth, '%m-%d') = ?
          AND t.is_active = 1
          AND t.deleted_at IS NULL
          AND t.email IS NOT NULL
          AND t.email != ''
      `, [todayDate]);
      
      console.log(`🎂 Found ${tenants.length} tenants with birthday today`);
      
      let sent = 0;
      let failed = 0;
      const failedEmails = [];
      
      for (const tenant of tenants) {
        try {
          // Get property name if property_id exists
          let propertyName = "Roomac";
          if (tenant.property_id) {
            const [[property]] = await db.query(
              "SELECT name FROM properties WHERE id = ?",
              [tenant.property_id]
            );
            if (property && property.name) {
              propertyName = property.name;
            }
          }
          
          // Get company address from settings
          const [settings] = await db.query(
            "SELECT value FROM app_settings WHERE setting_key = 'site_name'"
          );
          const companyAddress = settings.length > 0 ? settings[0].value : "Your Address Here";
          
          // Get birthday template - category = 'birthday', no sub_category needed
          const template = await getTemplate("birthday", "email");
          
          if (!template) {
            console.error(`❌ Template not found for tenant ${tenant.id}`);
            failed++;
            failedEmails.push({ id: tenant.id, email: tenant.email, reason: "Template not found" });
            continue;
          }
          
          // Replace variables in subject and content
          // Your template uses: tenant_name, year, company_address
          const emailSubject = replaceVariables(template.subject, {
            tenant_name: tenant.full_name,
            year: new Date().getFullYear(),
            company_address: companyAddress
          });
          
          const emailBody = replaceVariables(template.content, {
            tenant_name: tenant.full_name,
            year: new Date().getFullYear(),
            company_address: companyAddress
          });
          
          // Send email
          await sendEmail(
            tenant.email,
            emailSubject || "Happy Birthday! 🎉",
            emailBody
          );
          
          // Log the birthday wish sent (optional)
          await this.logBirthdaySent(tenant.id, tenant.email);
          
          console.log(`🎉 Birthday email sent to ${tenant.email} (${tenant.full_name})`);
          sent++;
          
        } catch (error) {
          console.error(`❌ Failed to send birthday email to tenant ${tenant.id}:`, error.message);
          failed++;
          failedEmails.push({ id: tenant.id, email: tenant.email, reason: error.message });
        }
      }
      
      console.log(`📊 Birthday cron completed: ${sent} sent, ${failed} failed`);
      
      return {
        success: true,
        sent,
        failed,
        failedEmails,
        date: today.toLocaleDateString()
      };
      
    } catch (error) {
      console.error("❌ Birthday cron failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Optional: Log birthday emails sent
  async logBirthdaySent(tenantId, email) {
    try {
      // Create table if not exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS birthday_email_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          email VARCHAR(255) NOT NULL,
          sent_at DATETIME NOT NULL,
          status ENUM('sent', 'failed') DEFAULT 'sent',
          error_message TEXT,
          INDEX idx_tenant_id (tenant_id),
          INDEX idx_sent_at (sent_at)
        )
      `);
      
      await db.query(`
        INSERT INTO birthday_email_logs (tenant_id, email, sent_at, status)
        VALUES (?, ?, NOW(), 'sent')
      `, [tenantId, email]);
    } catch (error) {
      console.error(`Failed to log birthday email for tenant ${tenantId}:`, error.message);
      // Don't throw - just log the error
    }
  }
}

module.exports = new BirthdayCron();