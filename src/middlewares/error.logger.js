import db from "../config/db.config.js";

export const errorLogger = async (err, req, res, next) => {
  console.log("method---------->", req.method);
  console.log(
    "originalUrl--------------->",
    `${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  console.log("err message----------------->", err.message);
  console.log("status code----------------->", res.statusCode);

  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  try {
    await db.query(
      `INSERT INTO error_logs (message,api)
         VALUES (?,?)`,
      [err.message, fullUrl]
    );
  } catch (dbErr) {
    console.error("Failed to insert status log:", dbErr.message);
  }

  next(err);
};
