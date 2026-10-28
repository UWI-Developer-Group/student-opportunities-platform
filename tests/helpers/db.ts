import mongoose from "mongoose";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { Opportunity } from "@/models/Opportunity";
import { Organization } from "@/models/Organization";
import { OrganizationMembership } from "@/models/OrganizationMembership";
import { User } from "@/models/User";

let memoryServer: MongoMemoryServer | MongoMemoryReplSet | undefined;

// Uses TEST_MONGODB_URI if set (its database name must contain "test"),
// otherwise starts an in-memory MongoDB. Never touches your real data.

export const startTestDb = () => start({ replicaSet: false });
export const startTestReplicaSetDb = () => start({ replicaSet: true });

async function start(options: { replicaSet: boolean }) {
  const externalUri = process.env.TEST_MONGODB_URI;
  if (externalUri) {
    process.env.MONGODB_URI = externalUri;
  } else {
    // Generous launch timeout: several test files start a MongoDB at the same time.
    memoryServer = options.replicaSet
      ? await MongoMemoryReplSet.create({
          replSet: { count: 1 },
          instanceOpts: [{ launchTimeout: 60_000 }],
        })
      : await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    process.env.MONGODB_URI = memoryServer.getUri("student-opportunities-test");
  }
  process.env.APP_URL ??= "http://localhost:3000";

  await connectToDatabase();

  if (!mongoose.connection.name.includes("test")) {
    await mongoose.disconnect();
    throw new Error(
      `Refusing to run tests on database "${mongoose.connection.name}": the name must contain "test".`,
    );
  }

  // Build indexes up front so unique-index tests are reliable.
  await Promise.all([
    User.init(),
    Organization.init(),
    OrganizationMembership.init(),
    Opportunity.init(),
  ]);
}

export async function clearTestDb() {
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMembership.deleteMany({}),
    Opportunity.deleteMany({}),
  ]);
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await memoryServer?.stop();
  // Reset the cache that lib/db.ts keeps on globalThis.
  (globalThis as { mongooseCache?: unknown }).mongooseCache = undefined;
}