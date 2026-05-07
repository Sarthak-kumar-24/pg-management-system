const router = require("express").Router();
const ctrl = require("../controllers/roomController");
const auth = require("../middleware/auth");
const role = require("../middleware/roleCheck");

router.get("/vacant/beds", auth, ctrl.vacantBeds);
router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.get);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, role("owner"), ctrl.remove);
router.patch("/:id/cleaning", auth, ctrl.toggleCleaning);

module.exports = router;
