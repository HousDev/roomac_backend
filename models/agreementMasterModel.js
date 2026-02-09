const db = require('../config/db');

class AgreementMasterModel {

  async create(data) {
    const {
      name,
      property_id,
      sharing_type,
      lock_in_months,
      lock_in_penalty_amount,
      notice_period_days,
      notice_penalty_amount,
      damage_deduction_allowed,
      max_damage_deduction,
      handover_rules,
      is_active
    } = data;

    const [result] = await db.query(
      `INSERT INTO agreement_masters (
        name,
        property_id,
        sharing_type,
        lock_in_months,
        lock_in_penalty_amount,
        notice_period_days,
        notice_penalty_amount,
        damage_deduction_allowed,
        max_damage_deduction,
        handover_rules,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        property_id,
        sharing_type,
        lock_in_months,
        lock_in_penalty_amount,
        notice_period_days,
        notice_penalty_amount,
        damage_deduction_allowed ? 1 : 0,
        max_damage_deduction || 0,
        handover_rules ? JSON.stringify(handover_rules) : null,
        is_active ? 1 : 0
      ]
    );

    return result.insertId;
  }

  async findAll() {
    const [rows] = await db.query(
      `SELECT am.*, p.name AS property_name
       FROM agreement_masters am
       JOIN properties p ON am.property_id = p.id
       ORDER BY am.created_at DESC`
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM agreement_masters WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  async findByPropertyAndSharing(property_id, sharing_type) {
    const [rows] = await db.query(
      `SELECT *
       FROM agreement_masters
       WHERE property_id = ?
         AND sharing_type = ?
         AND is_active = 1
       LIMIT 1`,
      [property_id, sharing_type]
    );
    return rows[0];
  }

  async update(id, data) {
    const {
      name,
      lock_in_months,
      lock_in_penalty_amount,
      notice_period_days,
      notice_penalty_amount,
      damage_deduction_allowed,
      max_damage_deduction,
      handover_rules,
      is_active
    } = data;

    await db.query(
      `UPDATE agreement_masters SET
        name = ?,
        lock_in_months = ?,
        lock_in_penalty_amount = ?,
        notice_period_days = ?,
        notice_penalty_amount = ?,
        damage_deduction_allowed = ?,
        max_damage_deduction = ?,
        handover_rules = ?,
        is_active = ?
       WHERE id = ?`,
      [
        name,
        lock_in_months,
        lock_in_penalty_amount,
        notice_period_days,
        notice_penalty_amount,
        damage_deduction_allowed ? 1 : 0,
        max_damage_deduction || 0,
        handover_rules ? JSON.stringify(handover_rules) : null,
        is_active ? 1 : 0,
        id
      ]
    );
  }

  async delete(id) {
    await db.query(
      `DELETE FROM agreement_masters WHERE id = ?`,
      [id]
    );
  }
}

module.exports = new AgreementMasterModel();
