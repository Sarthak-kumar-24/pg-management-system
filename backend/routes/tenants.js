const router = require("express").Router();
const ctrl = require("../controllers/tenantController");
const auth = require("../middleware/auth");
const role = require("../middleware/roleCheck");

router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.get);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, role("owner"), ctrl.remove);
router.post("/:id/vacate", auth, ctrl.vacate);
router.get("/public/room/:id", ctrl.getRoomPublic);
router.post("/public/onboard", ctrl.publicOnboard);
router.post("/public/login", ctrl.publicLogin);

module.exports = router;
