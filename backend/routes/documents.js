const router = require("express").Router();
const ctrl = require("../controllers/documentController");
const auth = require("../middleware/auth");

router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.get("/:id", auth, ctrl.get);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
