import { ZodError } from "zod";
import { requireOrganizationMember } from "@/features/auth/permissions";
import { OpportunityError } from "@/features/opportunities/errors";
import { createOpportunity } from "@/features/opportunities/commands";
import { isSameOriginRequest } from "@/lib/request-origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin is not allowed" }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  try {
    const actor = await requireOrganizationMember();
    const opportunity = await createOpportunity(actor, input);
    return Response.json({ opportunity }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Opportunity data is invalid", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof OpportunityError) {
      const status =
        error.code === "forbidden"
          ? 403
          : error.code === "not_found"
            ? 404
            : 409;
      return Response.json({ error: error.message }, { status });
    }

    console.error("Opportunity creation failed:", error);
    return Response.json({ error: "Opportunity creation failed" }, { status: 500 });
  }
}
