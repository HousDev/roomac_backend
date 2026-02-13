// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const db = require("./config/db");
// const fs = require('fs');
// const path = require('path');

// const authRoutes = require("./routes/authRoutes");
// const propertyRoutes = require("./routes/propertyRoutes");
// const tenantRoutes = require("./routes/tenantRoutes");
// const enquiriesRoutes = require("./routes/enquiryRoutes")
// const offerRoutes = require("./routes/offerRoutes")
// const roomRoutes = require("./routes/roomRoutes")
// const tenantAuthRoutes = require("./routes/tenantAuthRoutes");
// const staffRoutes = require("./routes/staffRoutes");
// const tenantDetailsRoutes = require("./routes/tenantDetailsRoutes");
// const tenantRequestsRoutes = require("./routes/tenantRequestsRoutes");
// const leaveRequestRoutes = require("./routes/adminLeaveRequestRoutes");
// const complaintsRoutes = require("./routes/adminComplaintsRoutes");
// const maintenanceRoutes = require("./routes/adminMaintenanceRoutes");
// const adminReceiptRoutes = require("./routes/adminReceiptRoutes");
// const masterRoutes = require("./routes/masterRoutes");
// const vacateRoutes = require('./routes/vacateRoutes');
// const changeBedRoutes = require("./routes/changeBedRoutes");
// const notificationRoutes = require('./routes/notificationRoutes');
// const adminVacateRequestRoutes = require('./routes/adminVacateRequestRoutes');
// const adminChangeBedRoutes = require('./routes/adminChangeBedRoutes');
// const tenantSettingsRoutes = require('./routes/tenantSettingsRoutes');
// const adminDeletionRequestsRoutes = require('./routes/adminDeletionRequestsRoutes');
// const settingsRoutes = require('./routes/settingsRoutes');
// const profileRoutes = require('./routes/adminProfileRoutes');
// const addOnRoutes = require("./routes/addOnRoutes");


// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// // ✅ CORS FIRST
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );


// db.getConnection()
//   .then((conn) => {
//     console.log("✅ MySQL Connected Successfully");
//     conn.release();
//   })
//   .catch((err) => {
//     console.error("❌ MySQL Connection Error:", err);
//   });

// // ❌ DO NOT USE express.json() BEFORE multer routes

// // ✅ ROUTES WITH MULTER
// app.use("/api/properties", propertyRoutes);

// // ✅ JSON ONLY FOR OTHER ROUTES
// app.use(express.json({ limit: "50mb" }));

// app.use("/api/auth", authRoutes);
// app.use("/api/tenants", tenantRoutes);
// app.use('/api/enquiries', enquiriesRoutes);
// app.use('/api/offers', offerRoutes)
// app.use('/api/rooms', roomRoutes)
// app.use("/api/staff", staffRoutes);
// app.use("/api/tenant-auth", tenantAuthRoutes);
// app.use("/api/tenant-details", tenantDetailsRoutes);
// app.use("/api/tenant-requests", tenantRequestsRoutes);
// app.use("/api/admin/complaints", complaintsRoutes);
// app.use("/api/admin/maintenance", maintenanceRoutes);
// app.use("/api/admin/receipts", adminReceiptRoutes);
// app.use("/api/admin/leave-requests", leaveRequestRoutes);
// app.use('/api/admin/vacate-requests', adminVacateRequestRoutes);
// app.use('/api/admin/change-bed-requests', adminChangeBedRoutes);
// app.use("/api/masters", masterRoutes);
// app.use('/api/vacate', vacateRoutes);
// app.use("/api/change-bed", changeBedRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/admin', require('./routes/notificationRoutes'));
// app.use('/api/tenant-settings', tenantSettingsRoutes);
// app.use('/api/admin/deletion-requests', adminDeletionRequestsRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/profile', profileRoutes);
// app.use("/api/admin/add-ons", addOnRoutes);





// // STATIC FILES
// app.use("/uploads", express.static("uploads"));

// // Serve static files from public directory
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.use(express.static(path.join(__dirname, 'public')));

// app.get("/", (req, res) => res.send("ROOMAC Backend API is running..."));



// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const db = require("./config/db");

// ROUTES
const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const enquiriesRoutes = require("./routes/enquiryRoutes");
const offerRoutes = require("./routes/offerRoutes");
const roomRoutes = require("./routes/roomRoutes");
const tenantAuthRoutes = require("./routes/tenantAuthRoutes");
const staffRoutes = require("./routes/staffRoutes");
const tenantDetailsRoutes = require("./routes/tenantDetailsRoutes");
const tenantRequestsRoutes = require("./routes/tenantRequestsRoutes");
const leaveRequestRoutes = require("./routes/adminLeaveRequestRoutes");
const complaintsRoutes = require("./routes/adminComplaintsRoutes");
const maintenanceRoutes = require("./routes/adminMaintenanceRoutes");
const adminReceiptRoutes = require("./routes/adminReceiptRoutes");
const masterRoutes = require("./routes/masterRoutes");
const vacateRoutes = require("./routes/vacateRoutes");
const changeBedRoutes = require("./routes/changeBedRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminVacateRequestRoutes = require("./routes/adminVacateRequestRoutes");
const adminChangeBedRoutes = require("./routes/adminChangeBedRoutes");
const tenantSettingsRoutes = require("./routes/tenantSettingsRoutes");
const adminDeletionRequestsRoutes = require("./routes/adminDeletionRequestsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const profileRoutes = require("./routes/adminProfileRoutes");
const addOnRoutes = require("./routes/addOnRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentsRoutes = require("./routes/payment.Routes");

const  paymentRoutes =require ("./routes/paymentRoutes");
dotenv.config();

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   CORS (PRODUCTION + LOCAL)
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://roomac.in",
    ],
    credentials: true,
  }),
);

/* =========================
   DATABASE CONNECTION
========================= */
db.getConnection()
  .then((conn) => {
    console.log("✅ MySQL Connected Successfully");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ MySQL Connection Error:", err);
  });

/* =========================
   🔥 STATIC FILES (IMPORTANT)
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   ROUTES
========================= */
// Multer routes first
app.use("/api/properties", propertyRoutes);

// Other routes
app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/enquiries", enquiriesRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tenant-auth", tenantAuthRoutes);
app.use("/api/tenant-details", tenantDetailsRoutes);
app.use("/api/tenant-requests", tenantRequestsRoutes);
app.use("/api/admin/complaints", complaintsRoutes);
app.use("/api/admin/maintenance", maintenanceRoutes);
app.use("/api/admin/receipts", adminReceiptRoutes);
app.use("/api/admin/leave-requests", leaveRequestRoutes);
app.use("/api/admin/vacate-requests", adminVacateRequestRoutes);
app.use("/api/admin/change-bed-requests", adminChangeBedRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/vacate", vacateRoutes);
app.use("/api/change-bed", changeBedRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tenant-settings", tenantSettingsRoutes);
app.use("/api/admin/deletion-requests", adminDeletionRequestsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin/add-ons", addOnRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentsRoutes);

app.use("/api/payment", paymentRoutes);

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
