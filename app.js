import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import order from "./src/routes/order.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";
import { errorLogger } from "./src/middlewares/error.logger.js";
import { ClientProxyFactory, Transport } from '@nestjs/microservices';


const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

// Connect to Auth microservice via TCP
export const authClient = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { port: 5001 },
});

// Routes
app.use("/api", order);

// Health Check
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Example route that throws an error
app.get("/error", (req, res, next) => {
  try {
    throw new Error("Simulated server crash");
  } catch (err) {
    next(err);
  }
});

app.use(errorLogger);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
