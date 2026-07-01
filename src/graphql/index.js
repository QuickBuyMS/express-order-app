/**
 * Apollo Server Setup
 *
 * Initializes Apollo Server v4 with Express middleware integration.
 * Extracts the Bearer token from the request, verifies it via the
 * auth microservice, and populates `context.user` for resolvers.
 */
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { profileTypeDefs } from "./typeDefs/profile.typeDefs.js";
import { profileResolvers } from "./resolvers/profile.resolvers.js";
import { lastValueFrom } from "rxjs";

/**
 * Starts Apollo Server and returns the Express middleware to mount.
 * Must be called with `await` before the Express app starts listening.
 */
export async function createGraphQLMiddleware(authClient) {
  const server = new ApolloServer({
    typeDefs: profileTypeDefs,
    resolvers: profileResolvers,
    // Disable introspection in production
    introspection: process.env.NODE_ENV !== "production",
  });

  await server.start();

  return expressMiddleware(server, {
    context: async ({ req }) => {
      // Extract and verify JWT via the auth microservice (same pattern as verifyToken middleware)
      const authHeader = req.headers["authorization"];
      if (!authHeader) return { user: null };

      const token = authHeader.replace("Bearer ", "");

      try {
        const verify = authClient.send({ cmd: "verify_token" }, { token });
        const result = await lastValueFrom(verify);

        if (!result.valid) return { user: null };

        return { user: result.decoded };
      } catch {
        return { user: null };
      }
    },
  });
}
