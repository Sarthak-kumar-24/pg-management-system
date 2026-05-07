const router = require("express").Router();
const ctrl = require("../controllers/complaintController");
const auth = require("../middleware/auth");

router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.get);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
