import { createInterface } from "node:readline/promises";
import { OpportunityCategory, OpportunityType } from "@/features/opportunities/constants";

type CreatedOpportunity = {
  id: string;
  slug: string;
  status: string;
};

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
  process.stdout.write("Password: ");

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

async function signIn(baseUrl: URL, origin: string) {
  const email = await ask("Organization member email: ");
  const password = await askPassword();

  const response = await fetch(new URL("/api/auth/sign-in/email", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(body?.message ?? body?.error ?? `Sign-in failed (${response.status}).`);
  }

  const cookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
  if (!cookies) {
    throw new Error("Sign-in succeeded but no session cookie was returned.");
  }
  return cookies;
}

function choices(values: object): string {
  return Object.values(values).join(", ");
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error("Run this command from an interactive terminal.");
  }

  const configuredUrl =
    process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const baseUrl = new URL(configuredUrl);
  const origin = baseUrl.origin;
  const cookies = await signIn(baseUrl, origin);

  console.log("\nEnter opportunity details. Optional fields can be left blank.");
  const input = {
    title: await ask("Title: "),
    summary: await ask("Summary: "),
    description: await ask("Description: "),
    category: await ask(`Category (${choices(OpportunityCategory)}): `),
    type: await ask(`Type (${choices(OpportunityType)}): `),
    location: await ask("Location (optional): "),
    imageUrl: await ask("Image URL (optional): "),
    applicationUrl: await ask("Application URL: "),
    additionalLinks: (await ask("Additional links, comma-separated (optional): "))
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean),
    deadline: await ask("Deadline (YYYY-MM-DD, optional): "),
  };

  const response = await fetch(new URL("/api/opportunities", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookies,
      origin,
    },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: string; issues?: { path: PropertyKey[]; message: string }[]; opportunity?: CreatedOpportunity }
    | null;

  if (!response.ok) {
    const details =
      body?.issues?.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n") ??
      body?.error;
    throw new Error(details ?? `Opportunity creation failed (${response.status}).`);
  }
  if (!body?.opportunity) {
    throw new Error("The server returned an unexpected creation response.");
  }

  console.log(
    `\nCreated opportunity ${body.opportunity.slug} (${body.opportunity.status}).`,
  );
  console.log(`ID: ${body.opportunity.id}`);
  console.log("Pending organizations' opportunities stay hidden until approval.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Opportunity CLI failed.");
  process.exitCode = 1;
});
