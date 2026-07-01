/**
 * Profile GraphQL Type Definitions
 *
 * Maps to the `users` table schema:
 *   user_id, name, email, phone, points, role, created_at, updated_at
 */

export const profileTypeDefs = `#graphql
  type User {
    user_id: Int
    name: String
    email: String
    phone: String
    points: Int
    role: String
    created_at: String
    updated_at: String
  }

  input UpdateProfileInput {
    name: String
    email: String
    phone: String
  }

  type ProfileResponse {
    status: Boolean!
    statusCode: Int!
    message: String!
    data: User
  }

  type Query {
    getProfile: ProfileResponse!
  }

  type Mutation {
    updateProfile(input: UpdateProfileInput!): ProfileResponse!
  }
`;
