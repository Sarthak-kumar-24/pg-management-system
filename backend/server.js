const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

// ── DB ──────────────────────────────────────────────────────────
connectDB();

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

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

// ── Serve Frontend ───────────────────────────────────────────────
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get("/login", (req, res) =>
  res.sendFile(path.join(frontendPath, "login.html")),
);
//app.get("*", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
app.get(/.*/, (req, res) =>
  res.sendFile(path.join(frontendPath, "index.html")),
);

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 PG Pro Server running on http://localhost:${PORT}`);
  console.log(`📂 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API Base: http://localhost:${PORT}/api\n`);
});
