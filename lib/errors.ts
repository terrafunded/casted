export const LAB_ERRORS = [
  "lab_missing_key",
  "lab_refused",
  "lab_timeout",
  "lab_busy",
  "lab_safety",
  "lab_no_print",
  "lab_failed",
] as const;

export type LabError = (typeof LAB_ERRORS)[number];

export function isLabError(value: string): value is LabError {
  return (LAB_ERRORS as readonly string[]).includes(value);
}

export function classifyLabError(err: unknown): LabError {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const m = raw.toLowerCase();

  if (
    m.includes("forbidden") ||
    m.includes("403") ||
    m.includes("unauthor") ||
    m.includes("401") ||
    m.includes("invalid key") ||
    m.includes("api key")
  ) {
    return "lab_refused";
  }
  if (
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("deadline") ||
    m.includes("function_invocation")
  ) {
    return "lab_timeout";
  }
  if (m.includes("429") || m.includes("rate") || m.includes("busy")) {
    return "lab_busy";
  }
  if (m.includes("safety") || m.includes("nsfw") || m.includes("moderat")) {
    return "lab_safety";
  }
  return "lab_failed";
}

export function labErrorFromResponse(
  status: number,
  body: string,
): LabError {
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error && isLabError(parsed.error)) return parsed.error;
  } catch {
    /* not json — Vercel HTML timeouts, etc. */
  }

  const lower = body.toLowerCase();
  if (
    status === 504 ||
    status === 524 ||
    lower.includes("function_invocation") ||
    lower.includes("timeout")
  ) {
    return "lab_timeout";
  }
  if (status === 403 || lower.includes("forbidden")) {
    return "lab_refused";
  }
  return "lab_failed";
}
