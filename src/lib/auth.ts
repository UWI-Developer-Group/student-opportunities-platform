
import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { getEnv } from "@/lib/env";

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
});
