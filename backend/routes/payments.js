const router = require("express").Router();
const ctrl = require("../controllers/paymentController");
const auth = require("../middleware/auth");
const role = require("../middleware/roleCheck");

router.get("/stats/summary", auth, ctrl.stats);
router.post("/generate-monthly", auth, ctrl.generateMonthly);
router.post("/electricity", auth, ctrl.addElectricity);
router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.get);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, role("owner"), ctrl.remove);
router.post("/export", auth, ctrl.exportAndClean);

module.exports = router;
