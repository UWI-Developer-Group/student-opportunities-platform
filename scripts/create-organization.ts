import { createInterface } from "node:readline/promises";

async function ask(question: string): Promise<string> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

async function askPassword(): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Password entry requires an interactive terminal.");
  }

  input.setEncoding("utf8");
  input.setRawMode(true);
  input.resume();
  process.stdout.write("Member password (8-128 characters): ");

  return new Promise((resolve, reject) => {
    let password = "";
    const finish = (error?: Error) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          password += character;
          process.stdout.write("*");
        }
      }
    };

    input.on("data", onData);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error("Run this command from an interactive terminal.");
  }

  const baseUrl = new URL(
    process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000",
  );
  const input = {
    organizationName: await ask("Organization name: "),
    description: await ask("Description (optional): "),
    websiteUrl: await ask("Website URL (optional): "),
    contactEmail: await ask("Organization contact email: "),
    memberName: await ask("Member name: "),
    memberEmail: await ask("Member login email: "),
    password: await askPassword(),
  };
  const confirmation = await ask("Confirm password: ");
  if (input.password !== confirmation) {
    throw new Error("Passwords do not match.");
  }

  const response = await fetch(new URL("/api/organizations", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl.origin,
    },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as
    | {
        error?: string;
        issues?: { path: PropertyKey[]; message: string }[];
        organization?: { slug: string; status: string };
        member?: { email: string };
      }
    | null;

  if (!response.ok) {
    const details =
      body?.issues?.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n") ??
      body?.error;
    throw new Error(details ?? `Organization registration failed (${response.status}).`);
  }
  if (!body?.organization || !body.member) {
    throw new Error("The server returned an unexpected registration response.");
  }

  console.log(`\nCreated ${body.organization.slug} (${body.organization.status}).`);
  console.log(`Member login: ${body.member.email}`);
  console.log("The organization must be approved before its opportunities are visible.");
  console.log("Use `npm run opportunity:create` to create an opportunity after registration.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Organization CLI failed.");
  process.exitCode = 1;
});
