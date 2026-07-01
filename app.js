import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import order from "./src/routes/order.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";
import { errorLogger } from "./src/middlewares/error.logger.js";
import { globalLimiter } from "./src/middlewares/rateLimiter.js";
import { createAuthClient } from './src/config/messaging.config.js';
import { createGraphQLMiddleware } from './src/graphql/index.js';



const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(globalLimiter);


// Connect to Auth microservice via feature-flagged transport (TCP or RMQ)
export const authClient = createAuthClient();

// Routes
app.use("/api/order", order);

// Health Check
app.get("/", (req, res) => {
  res.send("Order App is running...");
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

// ---- Async bootstrap: Apollo must start before Express listens ----
const PORT = process.env.PORT || 7000;

(async () => {
  try {
    const graphqlMiddleware = await createGraphQLMiddleware(authClient);

    // Mount GraphQL endpoint — uses its own CORS and body parsing
    app.use(
      "/graphql",
      cors(),
      express.json(),
      graphqlMiddleware,
    );

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`Microservice transport: ${process.env.TRANSPORT_TYPE}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();

export default app;
