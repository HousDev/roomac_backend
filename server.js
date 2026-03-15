const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const db = require("./config/db");
const http = require('http');
const WebSocket = require('ws');
// const { sendEmail } = require("./utils/emailService");

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
const notificationRoutes = require("./routes/adminNotificationRoutes");
const adminVacateRequestRoutes = require("./routes/adminVacateRequestRoutes");
const adminChangeBedRoutes = require("./routes/adminChangeBedRoutes");
const tenantSettingsRoutes = require("./routes/tenantSettingsRoutes");
const adminDeletionRequestsRoutes = require("./routes/adminDeletionRequestsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const profileRoutes = require("./routes/adminProfileRoutes");
const addOnRoutes = require("./routes/addOnRoutes");
const tenantNotificationsRoutes = require("./routes/tenantNotificationsRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentsRoutes = require("./routes/payment.Routes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const materialPurchaseRoutes = require("./routes/materialPurchaseRoutes"); // ✅ YEH LINE ADD KAREIN
const handoverRoutes = require("./routes/handoverRoutes");
const moveOutInspectionRoutes = require("./routes/moveOutInspectionRoutes"); // Add this line
const penaltyRulesRoutes = require('./routes/penaltyRulesRoutes');
const visitorRoutes = require("./routes/visitorRoutes"); // ✅ VISITOR LOGS
const restrictionRoutes =require('./routes/restrictionRoutes') ;
const  paymentRoutes =require ("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const propertyAnalyticsRoutes = require("./routes/propertyAnalyticsRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const templateRoutes = require('./routes/documentTemplateRoutes');
const documentRoutes = require("./routes/documentRoutes");  // ← ADD THIS
const documentListRoutes = require("./routes/documentListRoutes");  // ← ADD

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

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
      "https://www.roomac.in",
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
app.use("/api/admin/notifications", notificationRoutes);
app.use("/api/tenant-settings", tenantSettingsRoutes);
app.use("/api/admin/deletion-requests", adminDeletionRequestsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tenant-notifications", tenantNotificationsRoutes);
app.use("/api/admin/add-ons", addOnRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/material-purchases", materialPurchaseRoutes);
app.use("/api/handovers", handoverRoutes);
app.use("/api/move-out-inspections", moveOutInspectionRoutes); // Add this line
app.use("/api/settlements", require("./routes/settlementRoutes"));
app.use('/api/penalty-rules', penaltyRulesRoutes);
app.use("/api/visitors", visitorRoutes); // ✅ VISITOR LOGS
app.use("/api/visitor-restrictions", require("./routes/restrictionRoutes"));
app.use("/api/payment", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/properties", propertyAnalyticsRoutes);
app.use('/api/document-templates', templateRoutes);
app.use("/api/documents", documentRoutes);                   // ← ADD THIS
app.use("/api/documents", documentListRoutes);                       // ← ADD (same endpoint)

app.use("/api/expenses", expenseRoutes);
/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// sendEmail(
//   "kamlesh@hously.in",
//   "SMTP Test",
//   "<h2>Email working 🚀</h2>"
// );
