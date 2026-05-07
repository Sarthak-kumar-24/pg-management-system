const router = require("express").Router();
const ctrl = require("../controllers/reportController");
const auth = require("../middleware/auth");

router.get("/dashboard", auth, ctrl.dashboard);
router.get("/income", auth, ctrl.income);
router.get("/expenses", auth, ctrl.expenses);
router.get("/occupancy", auth, ctrl.occupancy);
router.get("/profit", auth, ctrl.profit);

module.exports = router;
