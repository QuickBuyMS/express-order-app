/**
 * Profile GraphQL Resolvers
 *
 * Reads from context.user (populated by Apollo context from the auth middleware).
 * Directly queries the MySQL pool — no REST round-trip.
 */
import db from "../../config/db.config.js";

export const profileResolvers = {
  Query: {
    getProfile: async (_parent, _args, context, info) => {
      const userId = context.user?.userId;
      if (!userId) {
        return {
          status: false,
          statusCode: 401,
          message: "Unauthorized — no valid token",
          data: null,
        };
      }

      try {
        // Parse requested fields for the User object (inside 'data')
        let requestedFields = [];
        const dataSelection = info.fieldNodes[0].selectionSet.selections.find(
          (s) => s.name.value === "data"
        );

        if (dataSelection && dataSelection.selectionSet) {
          requestedFields = dataSelection.selectionSet.selections.map(
            (s) => s.name.value
          );
        }

        // Only allow valid database columns to prevent SQL injection
        const validColumns = [
          "user_id", "name", "email", "phone", "points", "role", "created_at", "updated_at"
        ];

        // Filter requested fields against valid columns
        const selectColumns = requestedFields
          .filter((field) => validColumns.includes(field))
          .join(", ");

        // If no valid fields requested (e.g. only queried status/message), just return empty data
        if (!selectColumns) {
          return {
            status: true,
            statusCode: 200,
            message: "Profile metadata fetched (no user fields requested)",
            data: {},
          };
        }

        const [rows] = await db.query(
          `SELECT ${selectColumns} FROM users WHERE user_id = ?;`,
          [userId]
        );

        if (!rows.length) {
          return {
            status: false,
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        return {
          status: true,
          statusCode: 200,
          message: "Profile fetched successfully",
          data: rows[0],
        };
      } catch (error) {
        console.error("[GraphQL] getProfile error:", error.message);
        return {
          status: false,
          statusCode: 500,
          message: "Internal server error",
          data: null,
        };
      }
    },
  },

  Mutation: {
    updateProfile: async (_parent, { input }, context) => {
      const userId = context.user?.userId;
      if (!userId) {
        return {
          status: false,
          statusCode: 401,
          message: "Unauthorized — no valid token",
          data: null,
        };
      }

      try {
        // Build dynamic SET clause from provided fields only
        const allowedFields = ["name", "email", "phone"];
        const setClauses = [];
        const values = [];

        for (const field of allowedFields) {
          if (input[field] !== undefined && input[field] !== null) {
            setClauses.push(`${field} = ?`);
            values.push(input[field]);
          }
        }

        if (setClauses.length === 0) {
          return {
            status: false,
            statusCode: 400,
            message: "No valid fields provided for update",
            data: null,
          };
        }

        values.push(userId);

        await db.query(
          `UPDATE users SET ${setClauses.join(", ")} WHERE user_id = ?;`,
          values,
        );

        // Fetch updated profile
        const [rows] = await db.query(
          "SELECT user_id, name, email, phone, points, role, created_at, updated_at FROM users WHERE user_id = ?;",
          [userId],
        );

        return {
          status: true,
          statusCode: 200,
          message: "Profile updated successfully",
          data: rows[0],
        };
      } catch (error) {
        console.error("[GraphQL] updateProfile error:", error.message);

        // Handle MySQL duplicate-entry for email
        if (error.code === "ER_DUP_ENTRY") {
          return {
            status: false,
            statusCode: 409,
            message: "Email is already in use",
            data: null,
          };
        }

        return {
          status: false,
          statusCode: 500,
          message: "Internal server error",
          data: null,
        };
      }
    },
  },
};
