const jwt = require("jsonwebtoken");
const JWT_SECRET = "dfghjnhbgvf"; // Ensure this matches the secret used in login
const db = require("../config/db_settings"); // Ensure the correct db import

const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid token structure" });
    }

    // Fetch admin from the database
    const admin = await db.select("tbl_admins", "*", `id='${decoded.id}'`);
    if (!admin || admin.length === 0) {
      return res.status(401).json({ message: "Admin not found" });
    }

    req.admin = admin[0]; // Ensure correct structure
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = adminAuthMiddleware;
