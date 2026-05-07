const router = require("express").Router();
const ctrl = require("../controllers/userController");
const auth = require("../middleware/auth");
const role = require("../middleware/roleCheck");

router.get("/", auth, role("owner"), ctrl.list);
router.post("/", auth, role("owner"), ctrl.create);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, role("owner"), ctrl.remove);

module.exports = router;
