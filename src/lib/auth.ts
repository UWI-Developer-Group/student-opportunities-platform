import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { User, UserRole } from "@/models/User";

const { MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL } = getEnv();

const client = new MongoClient(MONGODB_URI);

const database = client.db();

export const auth = betterAuth({
  appName: "Student Opportunities Platform",
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,

  database: mongodbAdapter(database, {
    client,
  }),

  emailAndPassword: {
    enabled: true,
  },

  // Lets sign-up and sign-in inside Server Actions save the session cookie.
  // Keep it last in this list; Better Auth warns if another plugin comes after it.
  plugins: [nextCookies()],

  databaseHooks: {
    user: {
      create: {
        // Better Auth only handles login. Every new sign-up also gets our own
        // User record, which holds the role and (via memberships) organization access.
        after: async (authUser) => {
          await connectToDatabase();
          if (await User.exists({ authProviderId: authUser.id })) return;

          // Linked by Better Auth's id, never by email: otherwise anyone could sign up
          // with an admin's email address and inherit that account.
          // Sign-ups are always org_member; admins are created by a trusted script.
          await User.create({
            name: authUser.name,
            email: authUser.email,
            role: UserRole.ORG_MEMBER,
            authProviderId: authUser.id,
          });
        },
      },
    },
  },
});