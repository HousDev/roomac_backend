const db = require('../config/db');
const MasterModel = require('./masterModel');

class VacateModel {
  // Get initial data for vacate flow
  async getInitialData(bedAssignmentId) {
    try {
      // Get bed assignment details with tenant's lock-in and notice values
      const [bedAssignment] = await db.query(
        `SELECT ba.id, ba.room_id, ba.bed_number, ba.tenant_id,
                t.check_in_date,
                t.lockin_period_months,
                t.lockin_penalty_amount,
                t.lockin_penalty_type,
                t.notice_period_days,
                t.notice_penalty_amount,
                t.notice_penalty_type,
                r.property_id, r.rent_per_bed, r.room_number,
                p.security_deposit,
                p.name as property_name,
                t.full_name as tenant_name
         FROM bed_assignments ba
         JOIN rooms r ON ba.room_id = r.id
         JOIN properties p ON r.property_id = p.id
         JOIN tenants t ON ba.tenant_id = t.id
         WHERE ba.id = ? AND ba.is_available = FALSE`,
        [bedAssignmentId]
      );
      
      if (bedAssignment.length === 0) {
        throw new Error("Bed assignment not found or already vacated");
      }
      
      const bedData = bedAssignment[0];
      
      // Get vacate reasons
      const vacateReasons = await MasterModel.getValuesByCode('VACATE_REASON');
      
      return {
        bedAssignment: bedData,
        vacateReasons,
        tenantPolicy: {
          lockinPeriodMonths: bedData.lockin_period_months || 0,
          lockinPenaltyAmount: bedData.lockin_penalty_amount || 0,
          lockinPenaltyType: bedData.lockin_penalty_type || '',
          noticePeriodDays: bedData.notice_period_days || 0,
          noticePenaltyAmount: bedData.notice_penalty_amount || 0,
          noticePenaltyType: bedData.notice_penalty_type || ''
        },
        currentDate: new Date().toISOString().split('T')[0]
      };
      
    } catch (error) {
      console.error("VacateService.getInitialData error:", error);
      throw error;
    }
  }

  // Get bed assignment details
  async getBedAssignmentDetails(bedAssignmentId) {
    try {
      const [bedAssignment] = await db.query(
        `SELECT ba.*, r.room_number, r.property_id, t.full_name as tenant_name
         FROM bed_assignments ba
         JOIN rooms r ON ba.room_id = r.id
         JOIN tenants t ON ba.tenant_id = t.id
         WHERE ba.id = ?`,
        [bedAssignmentId]
      );
      
      return bedAssignment[0] || null;
    } catch (error) {
      console.error("VacateService.getBedAssignmentDetails error:", error);
      throw error;
    }
  }
  
  // Check lock-in status using tenant's lockin_period_months
// In vacateModel.js - Update the lock-in status calculation
async checkLockinStatusImmediately({
  bedAssignmentId,
  requestedVacateDate
}) {
  try {
    // Get tenant's check_in_date and lockin_period_months
    const [bedAssignment] = await db.query(
      `SELECT t.check_in_date, t.lockin_period_months
       FROM bed_assignments ba
       JOIN tenants t ON ba.tenant_id = t.id
       WHERE ba.id = ?`,
      [bedAssignmentId]
    );
    
    if (bedAssignment.length === 0) {
      throw new Error("Bed assignment not found");
    }
    
    const checkInDate = bedAssignment[0].check_in_date;
    const lockinMonths = bedAssignment[0].lockin_period_months || 0;
    
    if (!checkInDate || lockinMonths === 0) {
      return {
        isCompleted: true,
        message: "No lock-in period or check-in date not set",
        remainingMonths: 0,
        lockinMonths: 0
      };
    }
    
    const checkIn = new Date(checkInDate);
    const vacateDate = new Date(requestedVacateDate);
    
    // CORRECT CALCULATION: Add lock-in months to check-in date
    const lockInEndDate = new Date(checkIn);
    lockInEndDate.setMonth(checkIn.getMonth() + lockinMonths);
    
    const isCompleted = vacateDate >= lockInEndDate;
    
    if (isCompleted) {
      return {
        isCompleted: true,
        message: `Lock-in period completed (vacate date is after ${lockInEndDate.toISOString().split('T')[0]})`,
        remainingMonths: 0,
        lockinMonths: lockinMonths,
        completedMonths: lockinMonths,
        lockInEndDate: lockInEndDate
      };
    }
    
    // Calculate remaining time
    const timeDiff = lockInEndDate.getTime() - vacateDate.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const remainingMonths = Math.ceil(remainingDays / 30);
    
    return {
      isCompleted: false,
      message: `Lock-in period not completed. ${remainingDays} day(s) remaining out of ${lockinMonths} months`,
      remainingDays: remainingDays,
      remainingMonths: remainingMonths,
      lockinMonths: lockinMonths,
      completedMonths: Math.floor((lockinMonths * 30 - remainingDays) / 30),
      lockInEndDate: lockInEndDate
    };
    
  } catch (error) {
    console.error("VacateService.checkLockinStatusImmediately error:", error);
    throw error;
  }
}
  
  // Check notice period completion using tenant's notice_period_days
  async checkNoticeCompletion({
    noticeGivenDate,
    requestedVacateDate,
    bedAssignmentId
  }) {
    try {
      // Get tenant's notice_period_days
      const [bedAssignment] = await db.query(
        `SELECT t.notice_period_days
         FROM bed_assignments ba
         JOIN tenants t ON ba.tenant_id = t.id
         WHERE ba.id = ?`,
        [bedAssignmentId]
      );
      
      if (bedAssignment.length === 0) {
        throw new Error("Bed assignment not found");
      }
      
      const noticeDays = bedAssignment[0].notice_period_days || 0;
      
      if (!noticeGivenDate || noticeDays === 0) {
        return {
          isCompleted: false,
          message: "Notice period not started or no notice period required",
          remainingDays: 0,
          noticeDays: 0
        };
      }
      
      const noticeGiven = new Date(noticeGivenDate);
      const vacateDate = new Date(requestedVacateDate);
      
      // Calculate days between notice given and vacate date
      const timeDiff = vacateDate.getTime() - noticeGiven.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysDiff >= noticeDays) {
        return {
          isCompleted: true,
          message: `Notice period completed (${daysDiff} days out of ${noticeDays} days)`,
          remainingDays: 0,
          noticeDays: noticeDays,
          completedDays: daysDiff
        };
      }
      
      const remainingDays = noticeDays - daysDiff;
      
      return {
        isCompleted: false,
        message: `Notice period not completed. ${remainingDays} day(s) short of ${noticeDays} days`,
        remainingDays: remainingDays,
        noticeDays: noticeDays,
        completedDays: daysDiff
      };
      
    } catch (error) {
      console.error("VacateService.checkNoticeCompletion error:", error);
      throw error;
    }
  }
  
  // Calculate lock-in penalty using tenant's lockin_penalty_amount and lockin_penalty_type
  calculateLockinPenalty(penaltyType, penaltyAmount, rentPerBed, lockinStatus) {
    if (!lockinStatus || lockinStatus.isCompleted || !penaltyType) {
      return 0;
    }
    
    // If penalty amount is directly specified in tenant table
    if (penaltyAmount && penaltyAmount > 0) {
      return penaltyAmount;
    }
    
    // Calculate based on penalty type
    const lowerType = penaltyType.toLowerCase();
    
    if (lowerType.includes('one_month_rent')) {
      return rentPerBed;
    }
    
    if (lowerType.includes('two_month_rent')) {
      return rentPerBed * 2;
    }
    
    if (lowerType.includes('three_month_rent')) {
      return rentPerBed * 3;
    }
    
    if (lowerType.includes('half_month_rent')) {
      return rentPerBed / 2;
    }
    
    // Try to extract numeric amount from penalty type
    const amountMatch = penaltyType.match(/(\d+)/);
    if (amountMatch) {
      return parseInt(amountMatch[1]);
    }
    
    return 0;
  }
  
  // Calculate notice penalty using tenant's notice_penalty_amount and notice_penalty_type
  calculateNoticePenalty(penaltyType, penaltyAmount, rentPerBed, isNoticeGiven, noticeStatus) {
    if (isNoticeGiven) {
      // For notice not given penalty
      if (!noticeStatus || noticeStatus.isCompleted || !penaltyType) {
        return 0;
      }
      
      // If penalty amount is directly specified
      if (penaltyAmount && penaltyAmount > 0) {
        return penaltyAmount;
      }
      
      // Calculate based on penalty type
      const lowerType = penaltyType.toLowerCase();
      
      if (lowerType.includes('one_month_rent')) {
        return rentPerBed;
      }
      
      if (lowerType.includes('two_month_rent')) {
        return rentPerBed * 2;
      }
      
      if (lowerType.includes('three_month_rent')) {
        return rentPerBed * 3;
      }
      
      if (lowerType.includes('half_month_rent')) {
        return rentPerBed / 2;
      }
      
      // Try to extract numeric amount
      const amountMatch = penaltyType.match(/(\d+)/);
      if (amountMatch) {
        return parseInt(amountMatch[1]);
      }
    }
    
    return 0;
  }
  
  // Calculate all penalties using tenant table values
  async calculateStepByStepPenalties(data) {
    try {
      const {
        bedAssignmentId,
        vacateReasonValue,
        isNoticeGiven,
        noticeGivenDate,
        requestedVacateDate
      } = data;
      
      // Get bed details with tenant's policy values
      const [bedAssignment] = await db.query(
        `SELECT ba.id, ba.room_id, ba.bed_number, ba.tenant_id,
                t.check_in_date,
                t.lockin_period_months,
                t.lockin_penalty_amount,
                t.lockin_penalty_type,
                t.notice_period_days,
                t.notice_penalty_amount,
                t.notice_penalty_type,
                r.property_id, r.rent_per_bed, r.room_number,
                p.security_deposit
         FROM bed_assignments ba
         JOIN rooms r ON ba.room_id = r.id
         JOIN properties p ON r.property_id = p.id
         JOIN tenants t ON ba.tenant_id = t.id
         WHERE ba.id = ?`,
        [bedAssignmentId]
      );
      
      if (bedAssignment.length === 0) {
        throw new Error("Bed assignment not found");
      }
      
      const bedData = bedAssignment[0];
      
      // Step 1: Already have vacateReasonValue
      
      // Step 2: Calculate lock-in status and penalty using tenant's values
      const lockinStatus = await this.checkLockinStatusImmediately({
        bedAssignmentId,
        requestedVacateDate
      });
      
      let lockinPenalty = 0;
      if (!lockinStatus.isCompleted) {
        lockinPenalty = this.calculateLockinPenalty(
          bedData.lockin_penalty_type,
          bedData.lockin_penalty_amount,
          bedData.rent_per_bed,
          lockinStatus
        );
      }
      
      // Step 3: Get notice period from tenant table
      const noticeDays = bedData.notice_period_days || 0;
      
      // Step 4 & 5: Calculate notice status and penalty
      let noticeStatus = { isCompleted: false, message: "Notice period not started" };
      let noticePenalty = 0;
      
      if (isNoticeGiven && noticeGivenDate) {
        noticeStatus = await this.checkNoticeCompletion({
          noticeGivenDate,
          requestedVacateDate,
          bedAssignmentId
        });
        
        if (!noticeStatus.isCompleted) {
          noticePenalty = this.calculateNoticePenalty(
            bedData.notice_penalty_type,
            bedData.notice_penalty_amount,
            bedData.rent_per_bed,
            isNoticeGiven,
            noticeStatus
          );
        }
      } else if (!isNoticeGiven) {
        // Penalty for not giving notice
        noticePenalty = this.calculateNoticePenalty(
          bedData.notice_penalty_type,
          bedData.notice_penalty_amount,
          bedData.rent_per_bed,
          false,
          null
        );
      }
      
      // Calculate totals
      const totalPenalty = lockinPenalty + noticePenalty;
      const refundableAmount = Math.max(
        0,
        bedData.security_deposit - totalPenalty
      );
      
      return {
        bedDetails: bedData,
        vacateReasonValue,
        lockinPolicy: {
          periodMonths: bedData.lockin_period_months || 0,
          penaltyType: bedData.lockin_penalty_type || '',
          penaltyAmount: bedData.lockin_penalty_amount || 0,
          isCompleted: lockinStatus.isCompleted,
          calculatedPenalty: lockinPenalty,
          message: lockinStatus.message,
          remainingMonths: lockinStatus.remainingMonths,
          totalMonths: lockinStatus.lockinMonths
        },
        noticePolicy: {
          periodDays: bedData.notice_period_days || 0,
          penaltyType: bedData.notice_penalty_type || '',
          penaltyAmount: bedData.notice_penalty_amount || 0,
          isNoticeGiven: isNoticeGiven,
          isCompleted: noticeStatus.isCompleted,
          noticeGivenDate: noticeGivenDate,
          calculatedPenalty: noticePenalty,
          message: noticeStatus.message,
          remainingDays: noticeStatus.remainingDays,
          totalDays: noticeStatus.noticeDays
        },
        financials: {
          securityDeposit: bedData.security_deposit,
          rentPerBed: bedData.rent_per_bed,
          lockinPenalty: lockinPenalty,
          noticePenalty: noticePenalty,
          totalPenalty: totalPenalty,
          refundableAmount: refundableAmount
        },
        dates: {
          requestedVacateDate,
          checkInDate: bedData.check_in_date
        }
      };
      
    } catch (error) {
      console.error("VacateService.calculateStepByStepPenalties error:", error);
      throw error;
    }
  }
  
  // Submit vacate request - FIXED VERSION
  async submitVacateRequest(data) {
    const {
      bedAssignmentId,
      tenantId,
      roomId,
      propertyId,
      vacateReasonValue,
      lockinPeriodMonths,
      lockinPenaltyType,
      lockinPenaltyAmount,
      noticePeriodDays,
      noticePenaltyType,
      noticePenaltyAmount,
      requestedVacateDate,
      noticeGivenDate,
      securityDepositAmount,
      totalPenaltyAmount,
      refundableAmount,
      tenantAgreed,
      status,
      lockinPenaltyApplied,
      noticePenaltyApplied
    } = data;

    // **FIX: Ensure all numeric values are properly parsed**
    const parsedLockinPenaltyAmount = parseFloat(lockinPenaltyAmount) || 0;
    const parsedNoticePenaltyAmount = parseFloat(noticePenaltyAmount) || 0;
    const parsedSecurityDepositAmount = parseFloat(securityDepositAmount) || 0;
    const parsedTotalPenaltyAmount = parseFloat(totalPenaltyAmount) || 0;
    const parsedRefundableAmount = parseFloat(refundableAmount) || 0;

    console.log('🔢 Database values being inserted:', {
      totalPenaltyAmount: parsedTotalPenaltyAmount,
      refundableAmount: parsedRefundableAmount,
      lockinPenaltyAmount: parsedLockinPenaltyAmount,
      noticePenaltyAmount: parsedNoticePenaltyAmount
    });

    const query = `
      INSERT INTO vacate_records (
        bed_assignment_id,
        tenant_id,
        room_id,
        property_id,
        vacate_reason_value,
        lockin_period_months,
        lockin_penalty_type,
        lockin_penalty_amount,
        notice_period_days,
        notice_penalty_type,
        notice_penalty_amount,
        requested_vacate_date,
        notice_given_date,
        security_deposit_amount,
        total_penalty_amount,
        refundable_amount,
        tenant_agreed,
        status,
        lockin_penalty_applied,
        notice_penalty_applied,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      bedAssignmentId,
      tenantId,
      roomId,
      propertyId,
      vacateReasonValue,
      lockinPeriodMonths || 0,
      lockinPenaltyType || '',
      parsedLockinPenaltyAmount,
      noticePeriodDays || 0,
      noticePenaltyType || '',
      parsedNoticePenaltyAmount,
      requestedVacateDate,
      noticeGivenDate,
      parsedSecurityDepositAmount,
      parsedTotalPenaltyAmount,
      parsedRefundableAmount,
      tenantAgreed ? 1 : 0,
      status || 'pending',
      lockinPenaltyApplied ? 1 : 0,
      noticePenaltyApplied ? 1 : 0
    ];

    console.log('📝 SQL values:', values);

    const [result] = await db.query(query, values);
    return result.insertId;
  }

  // Update tenant request status
  async updateTenantRequestStatus(tenantRequestId, status) {
    try {
      const query = `
        UPDATE tenant_requests 
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.query(query, [status, tenantRequestId]);
      return true;
    } catch (error) {
      console.error("VacateService.updateTenantRequestStatus error:", error);
      throw error;
    }
  }

  // Mark bed as available - FIXED VERSION (REMOVED tenant status update)
  async markBedAsAvailable(bedAssignmentId) {
    try {
      // Only update the bed assignment, not the tenant status
      const query = `
        UPDATE bed_assignments 
        SET is_available = TRUE, updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.query(query, [bedAssignmentId]);
      
      // **FIX: Removed the tenant status update code**
      // The tenants table doesn't have a 'status' column
      // We're only marking the bed as available
      
      return true;
    } catch (error) {
      console.error("VacateService.markBedAsAvailable error:", error);
      throw error;
    }
  }
  
  // Get vacate history
  async getVacateHistory(bedAssignmentId) {
    try {
      const [records] = await db.query(
        `SELECT vr.*, 
                t.full_name as tenant_name,
                r.room_number,
                p.name as property_name
         FROM vacate_records vr
         JOIN tenants t ON vr.tenant_id = t.id
         JOIN rooms r ON vr.room_id = r.id
         JOIN properties p ON vr.property_id = p.id
         WHERE vr.bed_assignment_id = ?
         ORDER BY vr.created_at DESC`,
        [bedAssignmentId]
      );
      
      return records;
    } catch (error) {
      console.error("VacateService.getVacateHistory error:", error);
      throw error;
    }
  }
}

module.exports = new VacateModel();