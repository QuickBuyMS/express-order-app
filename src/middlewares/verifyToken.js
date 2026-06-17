import { lastValueFrom } from "rxjs";
import { authClient } from "../../app.js";

// Middleware to verify token
export const verifyTokenMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.replace("Bearer ", "");
  // console.log('Verifying token...');
  // const token = "";
  try {
    const verify = authClient.send({ cmd: "verify_token" }, { token });
    const result = await lastValueFrom(verify);

    if (!result.valid) {
      return res
        .status(401)
        .json({ error: "Unauthorized", details: result.error });
    }
    console.log('result.decoded', result.decoded)
    req.user = result.decoded;
    next();
  } catch (err) {
    res
      .status(500)
      .json({ error: "Verification service error", details: err.message });
  }
};
