export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) return false;

    const protocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();
    return !protocol || originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
