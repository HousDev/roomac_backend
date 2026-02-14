// const Booking = require("../models/BookingModel");
// const Payment = require("../models/PaymentModel");
// const TenantModel = require("../models/tenantModel");
// const EnquiryModel = require("../models/enquiryModel");
// const db = require("../config/db");

// const bookingController = {
//   // Create a new booking
//   async createBooking(req, res) {
//     const connection = await db.getConnection();
//     await connection.beginTransaction();

//     try {
//       const bookingData = req.body;
      
//       // Validate required fields
//       if (!bookingData.propertyId || !bookingData.roomId || !bookingData.fullName || !bookingData.phone) {
//         return res.status(400).json({
//           success: false,
//           message: "Missing required fields"
//         });
//       }

//       // Check room availability for short stays
//       if (bookingData.bookingType === 'short' && bookingData.checkInDate && bookingData.checkOutDate) {
//         const isAvailable = await Booking.checkRoomAvailability(
//           bookingData.roomId,
//           bookingData.checkInDate,
//           bookingData.checkOutDate
//         );
        
//         if (!isAvailable) {
//           return res.status(409).json({
//             success: false,
//             message: "Room is not available for the selected dates"
//           });
//         }
//       }

//       // Create booking
//       const newBooking = await Booking.create(bookingData);
      
//       // Handle based on payment method and booking type
//       let tenant = null;
//       let enquiry = null;
      
//       if (bookingData.paymentMethod === 'online') {
//         // ONLINE PAYMENT - Create tenant
//         console.log('Processing online payment - creating tenant');
        
//         // Check if tenant already exists
//         tenant = await TenantModel.findByEmailOrPhone(bookingData.email, bookingData.phone);
        
//         if (!tenant) {
//           // Prepare room data
//           const roomData = {
//             sharing_type: bookingData.sharingType || 'double'
//           };
          
//           // Prepare property data
//           const propertyData = {
//             name: bookingData.propertyName || 'Property'
//           };
          
//           // Create new tenant
//           const tenantId = await TenantModel.createFromBooking(bookingData, roomData, propertyData);
//           tenant = { id: tenantId, ...bookingData };
//         }
        
//         // Create payment record
//         await Payment.create({
//           tenant_id: tenant.id,
//           booking_id: newBooking.id,
//           amount: bookingData.totalAmount,
//           payment_date: new Date(),
//           payment_mode: 'online',
//           transaction_id: `TXN${Date.now()}`,
//           status: 'completed',
//           notes: `Payment for booking #${newBooking.id}`
//         });
        
//         // Update booking payment status
//         await Booking.updatePaymentStatus(newBooking.id, 'paid');
        
//       } else {
//         // IN-PERSON PAYMENT - Create enquiry
//         console.log('Processing in-person payment - creating enquiry');
        
//         const propertyData = {
//           name: bookingData.propertyName || 'Property'
//         };
        
//         enquiry = await EnquiryModel.createFromBooking(bookingData, propertyData);
        
//         // Update booking payment status
//         await Booking.updatePaymentStatus(newBooking.id, 'pending');
//       }

//       await connection.commit();
//       connection.release();

//       res.status(201).json({
//         success: true,
//         message: bookingData.paymentMethod === 'online'
//           ? "Booking confirmed successfully"
//           : "Booking request submitted successfully",
//         data: {
//           booking: {
//             id: newBooking.id,
//             ...bookingData
//           },
//           tenant: tenant || null,
//           enquiry: enquiry || null
//         }
//       });

//     } catch (error) {
//       await connection.rollback();
//       connection.release();
//       console.error("Error creating booking:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to create booking",
//         error: error.message
//       });
//     }
//   },

//   // Get booking by ID
//   async getBooking(req, res) {
//     try {
//       const { id } = req.params;
//       const booking = await Booking.findById(id);
      
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: "Booking not found"
//         });
//       }

//       // Get associated payments
//       const payments = await Payment.findByBooking(id);

//       res.status(200).json({
//         success: true,
//         data: {
//           ...booking,
//           payments
//         }
//       });

//     } catch (error) {
//       console.error("Error fetching booking:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch booking",
//         error: error.message
//       });
//     }
//   },

//   // Get all bookings
//   async getAllBookings(req, res) {
//     try {
//       const filters = {
//         status: req.query.status,
//         payment_status: req.query.payment_status,
//         booking_type: req.query.booking_type,
//         property_id: req.query.property_id,
//         start_date: req.query.start_date,
//         end_date: req.query.end_date
//       };

//       const bookings = await Booking.getAll(filters);
      
//       res.status(200).json({
//         success: true,
//         count: bookings.length,
//         data: bookings
//       });

//     } catch (error) {
//       console.error("Error fetching bookings:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch bookings",
//         error: error.message
//       });
//     }
//   },

//   // Update booking status
//   async updateBookingStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status } = req.body;

//       const updated = await Booking.updateStatus(id, status);
      
//       if (!updated) {
//         return res.status(404).json({
//           success: false,
//           message: "Booking not found"
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: "Booking status updated successfully"
//       });

//     } catch (error) {
//       console.error("Error updating booking status:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to update booking status",
//         error: error.message
//       });
//     }
//   },

//   // Get bookings by property
//   async getBookingsByProperty(req, res) {
//     try {
//       const { propertyId } = req.params;
//       const bookings = await Booking.findByProperty(propertyId);
      
//       res.status(200).json({
//         success: true,
//         count: bookings.length,
//         data: bookings
//       });

//     } catch (error) {
//       console.error("Error fetching property bookings:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch property bookings",
//         error: error.message
//       });
//     }
//   },

//   // Get bookings by tenant
//   async getBookingsByTenant(req, res) {
//     try {
//       const { email, phone } = req.query;
      
//       if (!email && !phone) {
//         return res.status(400).json({
//           success: false,
//           message: "Email or phone is required"
//         });
//       }

//       const bookings = await Booking.findByTenant(email, phone);
      
//       res.status(200).json({
//         success: true,
//         count: bookings.length,
//         data: bookings
//       });

//     } catch (error) {
//       console.error("Error fetching tenant bookings:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch tenant bookings",
//         error: error.message
//       });
//     }
//   },

//   // Check room availability
//   async checkAvailability(req, res) {
//     try {
//       const { roomId, checkInDate, checkOutDate } = req.query;
      
//       if (!roomId || !checkInDate || !checkOutDate) {
//         return res.status(400).json({
//           success: false,
//           message: "Room ID, check-in date, and check-out date are required"
//         });
//       }

//       const isAvailable = await Booking.checkRoomAvailability(roomId, checkInDate, checkOutDate);
      
//       res.status(200).json({
//         success: true,
//         data: {
//           available: isAvailable,
//           roomId,
//           checkInDate,
//           checkOutDate
//         }
//       });

//     } catch (error) {
//       console.error("Error checking availability:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to check availability",
//         error: error.message
//       });
//     }
//   },

//   // Get booking statistics
//   async getBookingStats(req, res) {
//     try {
//       const { propertyId } = req.query;
//       const stats = await Booking.getStats(propertyId);
      
//       res.status(200).json({
//         success: true,
//         data: stats
//       });

//     } catch (error) {
//       console.error("Error fetching booking stats:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch booking statistics",
//         error: error.message
//       });
//     }
//   },

//   // Cancel booking
//   async cancelBooking(req, res) {
//     const connection = await db.getConnection();
//     await connection.beginTransaction();

//     try {
//       const { id } = req.params;
//       const { reason } = req.body;

//       const booking = await Booking.findById(id);
      
//       if (!booking) {
//         await connection.rollback();
//         connection.release();
//         return res.status(404).json({
//           success: false,
//           message: "Booking not found"
//         });
//       }

//       // Update booking status to cancelled
//       await Booking.updateStatus(id, 'cancelled');

//       // If payment was made, update payment status to refunded
//       if (booking.payment_status === 'paid') {
//         const payments = await Payment.findByBooking(id);
        
//         for (const payment of payments) {
//           if (payment.status === 'completed') {
//             await Payment.updateStatus(payment.id, 'refunded');
//           }
//         }
//       }

//       await connection.commit();
//       connection.release();

//       res.status(200).json({
//         success: true,
//         message: "Booking cancelled successfully"
//       });

//     } catch (error) {
//       await connection.rollback();
//       connection.release();
//       console.error("Error cancelling booking:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to cancel booking",
//         error: error.message
//       });
//     }
//   }
// };

// module.exports = bookingController;

const Booking = require("../models/BookingModel");
const Payment = require("../models/PaymentModel");
const TenantModel = require("../models/tenantModel");
const EnquiryModel = require("../models/enquiryModel");
const db = require("../config/db");

const bookingController = {
  async createBooking(req, res) {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      let data = req.body;

      if (!data.propertyId || !data.roomId || !data.fullName || !data.phone) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      // normalize
      data.bookingType = data.bookingType === "short" ? "daily" : "monthly";
      data.paymentStatus = "pending";
      data.tenantId = null;

      if (
        data.bookingType === "daily" &&
        data.checkInDate &&
        data.checkOutDate
      ) {
        const available = await Booking.checkRoomAvailability(
          data.roomId,
          data.checkInDate,
          data.checkOutDate,
        );

        if (!available) {
          await conn.rollback();
          conn.release();
          return res
            .status(409)
            .json({ success: false, message: "Room not available" });
        }
      }

      const booking = await Booking.create(data);

      let tenant = null;
      let enquiry = null;

      if (data.paymentMethod === "online") {
        tenant = await TenantModel.findByEmailOrPhone(data.email, data.phone);

        if (!tenant) {
          const tenantId = await TenantModel.createFromBooking(
            data,
            { sharing_type: data.sharingType },
            { name: data.propertyName },
          );
          tenant = { id: tenantId };
        }

        await Payment.create({
          tenant_id: tenant.id,
          booking_id: booking.id,
          amount: data.totalAmount,
          payment_mode: "online",
          status: "completed",
        });

        await Booking.updatePaymentStatus(booking.id, "paid");
      } else {
        enquiry = await EnquiryModel.createFromBooking(data, {
          name: data.propertyName,
        });
      }

      await conn.commit();
      conn.release();

      res.status(201).json({
        success: true,
        bookingId: booking.id,
        tenant,
        enquiry,
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getBooking(req, res) {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false });
    res.json({ success: true, data: booking });
  },

  async getAllBookings(req, res) {
    const data = await Booking.getAll(req.query);
    res.json({ success: true, data });
  },

  async updateBookingStatus(req, res) {
    const ok = await Booking.updateStatus(req.params.id, req.body.status);
    res.json({ success: ok });
  },

  async getBookingsByProperty(req, res) {
    const data = await Booking.findByProperty(req.params.propertyId);
    res.json({ success: true, data });
  },

  async getBookingsByTenant(req, res) {
    const data = await Booking.findByTenant(req.query.email, req.query.phone);
    res.json({ success: true, data });
  },

  async checkAvailability(req, res) {
    const ok = await Booking.checkRoomAvailability(
      req.query.roomId,
      req.query.checkInDate,
      req.query.checkOutDate,
    );
    res.json({ success: true, available: ok });
  },

  async getBookingStats(req, res) {
    const stats = await Booking.getStats(req.query.propertyId);
    res.json({ success: true, data: stats });
  },

  async cancelBooking(req, res) {
    await Booking.updateStatus(req.params.id, "cancelled");
    res.json({ success: true });
  },
};

module.exports = bookingController;
