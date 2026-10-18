export type OpportunityErrorCode = "forbidden" | "not_found" | "invalid_state";

export class OpportunityError extends Error {
  constructor(
    readonly code: OpportunityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OpportunityError";
  }
}