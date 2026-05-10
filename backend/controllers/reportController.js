const Building = require("../models/Building");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");
const Payment = require("../models/Payment");
const Bill = require("../models/Bill");
const Complaint = require("../models/Complaint");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// GET /api/reports/dashboard
/*
exports.dashboard = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalTenants,
      activeTenants,
      buildingCount,
      allRooms,
      openComplaints,
      pendingPayments,
      thisMonthPaid,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: "active" }),
      Building.countDocuments({ isActive: true }),
      Room.find({}),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Payment.find({
        status: { $in: ["pending", "overdue"] },
        type: "rent",
        month,
        year,
      })
        .populate("tenant", "name phone")
        .populate("building", "name")
        .populate("room", "roomNumber")
        .limit(20),
      Payment.find({ status: "paid", type: "rent", month, year }),
    ]);

    const totalBeds = allRooms.reduce((s, r) => s + r.totalBeds, 0);
    const occupiedBeds = allRooms.reduce(
      (s, r) => s + r.beds.filter((b) => b.isOccupied).length,
      0,
    );
    const totalIncome = thisMonthPaid.reduce((s, p) => s + p.amount, 0);
    const pendingDues = pendingPayments.reduce((s, p) => s + p.amount, 0);

    res.json({
      totalTenants,
      activeTenants,
      buildingCount,
      totalRooms: allRooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds: totalBeds - occupiedBeds,
      openComplaints,
      totalIncome,
      pendingDues,
      pendingPaymentsCount: pendingPayments.length,
      pendingPayments,
      month,
      year,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
/*
exports.dashboard = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalTenants,
      activeTenants, // 🛑 FIX: Now counts both active AND notice period for true occupancy
      buildingCount,
      allRooms,
      openComplaints,
      pendingPayments,
      thisMonthPaid,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: { $in: ["active", "notice_period"] } }), 
      Building.countDocuments({ isActive: true }),
      Room.find({}),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Payment.find({
        status: { $in: ["pending", "overdue"] },
        type: "rent",
        month,
        year,
      })
        .populate("tenant", "name phone")
        .populate("building", "name")
        .populate("room", "roomNumber")
        .limit(20),
      Payment.find({ status: "paid", type: "rent", month, year }),
    ]);

    // 🛑 FIX: Total beds physical count
    const totalBeds = allRooms.reduce((s, r) => s + (r.totalBeds || 1), 0);
    
    // 🛑 FIX: Occupied beds is strictly equal to living bodies!
    const occupiedBeds = activeTenants;
    
    // 🛑 FIX: Math.max ensures vacant beds don't go negative if overbooked
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

    const totalIncome = thisMonthPaid.reduce((s, p) => s + p.amount, 0);
    const pendingDues = pendingPayments.reduce((s, p) => s + p.amount, 0);

    res.json({
      totalTenants,
      activeTenants,
      buildingCount,
      totalRooms: allRooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      openComplaints,
      totalIncome,
      pendingDues,
      pendingPaymentsCount: pendingPayments.length,
      pendingPayments,
      month,
      year,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
// GET /api/reports/dashboard
/*
exports.dashboard = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalTenants,
      activeTenantsList, // 🛑 FIX: Fetch FULL tenant profiles to read their exact rent
      buildingCount,
      allRooms,
      openComplaints,
      thisMonthRentPayments, // 🛑 FIX: Fetch ALL rent payments for this month
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.find({ status: { $in: ["active", "notice_period"] } }).populate("building room"),
      Building.countDocuments({ isActive: true }),
      Room.find({}),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Payment.find({ type: "rent", month, year }).populate("tenant", "name phone").populate("building", "name").populate("room", "roomNumber"),
    ]);

    // 1. Physical Room/Bed Occupancy
    const totalBeds = allRooms.reduce((s, r) => s + (r.totalBeds || 1), 0);
    const occupiedBeds = activeTenantsList.length; 
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

    // 2. TRUE Financial Calculation (Expected vs Collected)
    let expectedRent = 0;
    let totalIncome = 0;
    let dynamicPendingDues = [];
    let pendingDuesAmount = 0;

    // Calculate total collected rent (Summing up only successful payments)
    thisMonthRentPayments.forEach(p => {
      if (p.status === 'paid' || p.status === 'partial') {
        totalIncome += p.amount;
      }
    });

    // 3. The Core Logic: Compare what each tenant paid vs what they SHOULD pay
    activeTenantsList.forEach(tenant => {
      const expected = tenant.monthlyRent || 0;
      expectedRent += expected;

      // Find all successful payments this specific tenant made this month
      const tenantPayments = thisMonthRentPayments.filter(p => 
        p.tenant && p.tenant._id.toString() === tenant._id.toString() && (p.status === 'paid' || p.status === 'partial')
      );
      
      const tenantPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingDue = expected - tenantPaid;

      // If they haven't paid their full rent, add them to the Pending Dues list!
      if (remainingDue > 0) {
        pendingDuesAmount += remainingDue;
        dynamicPendingDues.push({
          _id: "due_" + tenant._id,
          tenant: tenant,
          building: tenant.building,
          room: tenant.room,
          amount: remainingDue, // Exact missing amount (e.g. 8000 - 7500 = 500)
          status: "pending",
          month,
          year,
          type: "rent"
        });
      }
    });

    res.json({
      totalTenants,
      activeTenants: activeTenantsList.length,
      buildingCount,
      totalRooms: allRooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      openComplaints,
      
      // 🛑 The newly corrected financial data being sent to your frontend
      expectedIncome: expectedRent,
      totalIncome: totalIncome,
      pendingDues: pendingDuesAmount,
      pendingPaymentsCount: dynamicPendingDues.length,
      pendingPayments: dynamicPendingDues.slice(0, 20), // Send top 20 to the UI
      
      month,
      year,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
// GET /api/reports/dashboard
exports.dashboard = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalTenants,
      activeTenantsList, // Fetches FULL tenant profiles for rent data
      buildingCount,
      allRooms,
      openComplaints,
      thisMonthRentPayments, // Fetches ALL rent payments
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.find({ status: { $in: ["active", "notice_period"] } }).populate("building room"),
      Building.countDocuments({ isActive: true }),
      Room.find({}),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      Payment.find({ type: "rent", month, year }).populate("tenant", "name phone").populate("building", "name").populate("room", "roomNumber"),
    ]);

    // 1. PHYSICAL BED CALCULATION (Room-by-Room to prevent spillover)
    const totalBeds = allRooms.reduce((s, r) => s + (r.totalBeds || 1), 0);
    
    let occupiedPhysicalBeds = 0;
    allRooms.forEach(room => {
      // Find tenants living in this specific room
      const tenantsInRoom = activeTenantsList.filter(t => t.room && t.room._id.toString() === room._id.toString());
      
      // Calculate occupied physical beds for this room (Max is the room's total beds)
      const physicalOccupied = Math.min(room.totalBeds || 1, tenantsInRoom.length);
      occupiedPhysicalBeds += physicalOccupied;
    });

    const vacantBeds = totalBeds - occupiedPhysicalBeds;

    // 2. TRUE FINANCIAL CALCULATION (Expected vs Collected)
    let expectedRent = 0;
    let totalIncome = 0;
    let dynamicPendingDues = [];
    let pendingDuesAmount = 0;

    // Sum up only successful payments
    thisMonthRentPayments.forEach(p => {
      if (p.status === 'paid' || p.status === 'partial') {
        totalIncome += p.amount;
      }
    });

    // Cross-reference what each tenant paid vs what their profile says they owe
    activeTenantsList.forEach(tenant => {
      const expected = tenant.monthlyRent || 0;
      expectedRent += expected;

      const tenantPayments = thisMonthRentPayments.filter(p => 
        p.tenant && p.tenant._id.toString() === tenant._id.toString() && (p.status === 'paid' || p.status === 'partial')
      );
      
      const tenantPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingDue = expected - tenantPaid;

      // Add to pending dues list if they owe money
      if (remainingDue > 0) {
        pendingDuesAmount += remainingDue;
        dynamicPendingDues.push({
          _id: "due_" + tenant._id,
          tenant: tenant,
          building: tenant.building,
          room: tenant.room,
          amount: remainingDue,
          status: "pending",
          month,
          year,
          type: "rent"
        });
      }
    });

    res.json({
      totalTenants,
      activeTenants: activeTenantsList.length,
      buildingCount,
      totalRooms: allRooms.length,
      totalBeds,
      occupiedBeds: occupiedPhysicalBeds, // 🛑 Uses the corrected physical bed count
      vacantBeds,
      openComplaints,
      
      // Financials
      expectedIncome: expectedRent,
      totalIncome: totalIncome,
      pendingDues: pendingDuesAmount,
      pendingPaymentsCount: dynamicPendingDues.length,
      pendingPayments: dynamicPendingDues.slice(0, 20),
      
      month,
      year,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/income
exports.income = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const filter = { type: "rent", status: "paid", year };
    if (req.query.building) filter.building = req.query.building;
    const payments = await Payment.find(filter);
    const monthly = MONTHS.map((monthName, i) => {
      const m = i + 1;
      const set = payments.filter((p) => p.month === m);
      return {
        month: m,
        monthName,
        income: set.reduce((s, p) => s + p.amount, 0),
        count: set.length,
      };
    });
    res.json({
      monthly,
      total: monthly.reduce((s, m) => s + m.income, 0),
      year,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/expenses
exports.expenses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.building) filter.building = req.query.building;
    const bills = await Bill.find(filter).populate("building", "name");
    const byType = {};
    bills.forEach((b) => {
      byType[b.type] = (byType[b.type] || 0) + b.totalAmount;
    });
    res.json({
      bills,
      byType,
      total: bills.reduce((s, b) => s + b.totalAmount, 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/occupancy
/*
exports.occupancy = async (req, res) => {
  try {
    const buildings = await Building.find({ isActive: true });
    const report = await Promise.all(
      buildings.map(async (b) => {
        const rooms = await Room.find({ building: b._id });
        const totalBeds = rooms.reduce((s, r) => s + r.totalBeds, 0);
        const occupiedBeds = rooms.reduce(
          (s, r) => s + r.beds.filter((bed) => bed.isOccupied).length,
          0,
        );
        const activeTenants = await Tenant.countDocuments({
          building: b._id,
          status: "active",
        });
        return {
          building: b.name,
          buildingId: b._id,
          type: b.type,
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          vacantBeds: totalBeds - occupiedBeds,
          activeTenants,
          occupancyRate: totalBeds
            ? +((occupiedBeds / totalBeds) * 100).toFixed(1)
            : 0,
        };
      }),
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
/*
exports.occupancy = async (req, res) => {
  try {
    const buildings = await Building.find({ isActive: true });
    const report = await Promise.all(
      buildings.map(async (b) => {
        const rooms = await Room.find({ building: b._id });
        const totalBeds = rooms.reduce((s, r) => s + (r.totalBeds || 1), 0);
        
        // 🛑 FIX: Count real active tenants for this specific building
        const activeTenants = await Tenant.countDocuments({
          building: b._id,
          status: { $in: ["active", "notice_period"] },
        });

        // 🛑 FIX: Sync occupied beds to active tenants
        const occupiedBeds = activeTenants;
        const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

        return {
          building: b.name,
          buildingId: b._id,
          type: b.type,
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          vacantBeds,
          activeTenants,
          occupancyRate: totalBeds
            ? +((occupiedBeds / totalBeds) * 100).toFixed(1)
            : 0,
        };
      }),
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
// GET /api/reports/occupancy
exports.occupancy = async (req, res) => {
  try {
    const buildings = await Building.find({ isActive: true });
    const report = await Promise.all(
      buildings.map(async (b) => {
        const rooms = await Room.find({ building: b._id });
        const totalBeds = rooms.reduce((s, r) => s + (r.totalBeds || 1), 0);
        
        const activeTenantsList = await Tenant.find({
          building: b._id,
          status: { $in: ["active", "notice_period"] },
        }).select("room");

        // 🛑 Apply the room-by-room physical bed logic to the occupancy table as well
        let occupiedPhysicalBeds = 0;
        rooms.forEach(room => {
          const tenantsInRoom = activeTenantsList.filter(t => t.room && t.room.toString() === room._id.toString());
          occupiedPhysicalBeds += Math.min(room.totalBeds || 1, tenantsInRoom.length);
        });

        const vacantBeds = totalBeds - occupiedPhysicalBeds;

        return {
          building: b.name,
          buildingId: b._id,
          type: b.type,
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds: occupiedPhysicalBeds, 
          vacantBeds,
          activeTenants: activeTenantsList.length,
          occupancyRate: totalBeds
            ? +((occupiedPhysicalBeds / totalBeds) * 100).toFixed(1)
            : 0,
        };
      }),
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET /api/reports/profit
exports.profit = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const pFilter = { status: "paid", type: "rent", year };
    const bFilter = { year };
    if (req.query.building) {
      pFilter.building = req.query.building;
      bFilter.building = req.query.building;
    }
    const [payments, bills] = await Promise.all([
      Payment.find(pFilter),
      Bill.find(bFilter),
    ]);
    const monthly = MONTHS.map((monthName, i) => {
      const m = i + 1;
      const income = payments
        .filter((p) => p.month === m)
        .reduce((s, p) => s + p.amount, 0);
      const expense = bills
        .filter((b) => b.month === m)
        .reduce((s, b) => s + b.totalAmount, 0);
      return { month: m, monthName, income, expense, profit: income - expense };
    });
    const totals = monthly.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expense: acc.expense + m.expense,
        profit: acc.profit + m.profit,
      }),
      { income: 0, expense: 0, profit: 0 },
    );
    res.json({ monthly, totals, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
