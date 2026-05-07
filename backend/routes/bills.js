const router = require("express").Router();
const ctrl = require("../controllers/billController");
const auth = require("../middleware/auth");
const role = require("../middleware/roleCheck");

router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, role("owner"), ctrl.remove);

module.exports = router;
