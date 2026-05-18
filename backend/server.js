const express = require("express");
const startCronJobs = require('./routes/cronJobs');
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

// ── DB ──────────────────────────────────────────────────────────
connectDB();
startCronJobs();


// ── Middleware ───────────────────────────────────────────────────
//app.use(cors({ origin: "*", credentials: true }));
// 🛑 THE FIX: Explicitly whitelist your new domain to satisfy browser security
app.use(cors({ 
  origin: [
    "https://pratham-pg.onrender.com", // Your new live URL
    "http://localhost:5000",           // For local testing
    "http://localhost:3000"            // If you use a separate frontend locally
  ], 
  credentials: true 
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/buildings", require("./routes/buildings"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/complaints", require("./routes/complaints"));
app.use("/api/notices", require("./routes/notices"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/users", require("./routes/users"));
app.use("/api/rules", require("./routes/rules"));

// ── Serve Frontend ───────────────────────────────────────────────
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get("/login", (req, res) =>
  res.sendFile(path.join(frontendPath, "login.html")),
);
app.get("/onboard.html", (req, res) =>
  res.sendFile(path.join(frontendPath, "onboard.html")),
);

app.get("/tenant.html", (req, res) =>
  res.sendFile(path.join(frontendPath, "tenant.html")),
);
//app.get("*", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
app.get(/.*/, (req, res) =>
  res.sendFile(path.join(frontendPath, "index.html")),
);
// 🛑 GLOBAL ERROR HANDLER (Must be placed AFTER all routes)
app.use((err, req, res, next) => {
  console.error("Backend Error:", err.message); // Logs to Render terminal
  
  // Force Express to send the error as a JSON object, not HTML!
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error" 
  });
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 PG Pro Server running on http://localhost:${PORT}`);
  console.log(`📂 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API Base: http://localhost:${PORT}/api\n`);
});
