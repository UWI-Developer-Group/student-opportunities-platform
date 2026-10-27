// Creates a platform admin, or promotes an existing account.
//
//   ADMIN_PASSWORD='a-long-password' npm run create-admin -- you@example.com
//   ADMIN_PASSWORD='a-long-password' npm run create-admin -- you@example.com --name "Full Name"
//

import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User, UserRole } from "@/models/User";

const MIN_PASSWORD_LENGTH = 12;

function readArgs() {
  const args = process.argv.slice(2);
  const nameIndex = args.indexOf("--name");
  const positional = args.filter(
    (arg, i) => !arg.startsWith("--") && !(nameIndex >= 0 && i === nameIndex + 1),
  );
  return {
    email: positional[0]?.trim().toLowerCase(),
    name: (nameIndex >= 0 ? args[nameIndex + 1]?.trim() : undefined) || "Platform Admin",
  };
}

async function createAdmin(email: string, name: string) {
  const existing = await User.findOne({ email });

  if (existing && !existing.authProviderId) {
    throw new Error(
      `${email} already exists but has no login account (it looks like seed data). Use a different email.`,
    );
  }

  if (existing) {
    if (existing.role === UserRole.ADMIN) {
      console.log(`${email} is already an admin.`);
      return;
    }
    existing.role = UserRole.ADMIN;
    await existing.save();
    console.log(`Promoted ${email} to admin.`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Set ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) to create a new account.`,
    );
  }

  // Better Auth creates the login; its sign-up hook creates our User as org_member.
  const { user } = await auth.api.signUpEmail({ body: { name, email, password } });

  const promoted = await User.findOneAndUpdate(
    { authProviderId: user.id },
    { $set: { role: UserRole.ADMIN } },
    { returnDocument: "after" },
  );
  if (!promoted) {
    throw new Error(
      "The login was created but its User record is missing, so it could not be promoted.",
    );
  }
  console.log(`Created admin ${email}.`);
}

async function main() {
  const { email, name } = readArgs();
  if (!email) {
    throw new Error("Usage: ADMIN_PASSWORD='...' npm run create-admin -- <email> [--name \"Full Name\"]");
  }

  await connectToDatabase();
  console.log(`Database "${mongoose.connection.name}"`);
  await createAdmin(email, name);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0); // lib/auth.ts keeps its own MongoDB client open
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  });