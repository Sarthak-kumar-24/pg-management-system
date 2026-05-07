const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers["authorization"] || req.headers["Authorization"];
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token)
    return res.status(401).json({ error: "No token — access denied" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "pgpro_secret");
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
