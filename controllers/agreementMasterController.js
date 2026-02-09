const AgreementMaster = require('../models/agreementMasterModel');

class AgreementMasterController {

  async create(req, res) {
    try {
      const id = await AgreementMaster.create(req.body);

      res.json({
        success: true,
        message: 'Agreement created successfully',
        agreement_id: id
      });
    } catch (err) {
      console.error('Create Agreement error:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async getAll(req, res) {
    try {
      const agreements = await AgreementMaster.findAll();

      res.json({
        success: true,
        data: agreements
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async getById(req, res) {
    try {
      const agreement = await AgreementMaster.findById(req.params.id);

      if (!agreement) {
        return res.status(404).json({
          success: false,
          message: 'Agreement not found'
        });
      }

      res.json({
        success: true,
        data: agreement
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async getByPropertySharing(req, res) {
    try {
      const { property_id, sharing_type } = req.query;

      const agreement = await AgreementMaster.findByPropertyAndSharing(
        property_id,
        sharing_type
      );

      if (!agreement) {
        return res.status(404).json({
          success: false,
          message: 'No active agreement found'
        });
      }

      res.json({
        success: true,
        data: agreement
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async update(req, res) {
    try {
      await AgreementMaster.update(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Agreement updated successfully'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  async delete(req, res) {
    try {
      await AgreementMaster.delete(req.params.id);

      res.json({
        success: true,
        message: 'Agreement deleted successfully'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = new AgreementMasterController();
