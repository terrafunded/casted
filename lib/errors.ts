export type GenerateFailure = {
  error: string;
  status: number;
};

function clip(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

function isBareForbidden(text: string): boolean {
  return /^forbidden\.?$/i.test(text.trim());
}

function reasonFromBody(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") {
    return isBareForbidden(body) ? "" : clip(body);
  }
  if (typeof body !== "object") return "";

  const record = body as Record<string, unknown>;
  const candidates = [record.detail, record.message, record.error, record.msg];

  for (const value of candidates) {
    if (typeof value === "string" && value && !isBareForbidden(value)) {
      return clip(value);
    }
    if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
      const msg = (value[0] as { msg?: string; message?: string }).msg
        ?? (value[0] as { message?: string }).message;
      if (msg && !isBareForbidden(msg)) return clip(msg);
    }
  }

  try {
    const json = clip(JSON.stringify(body));
    return isBareForbidden(json) ? "" : json;
  } catch {
    return "";
  }
}

function fallbackForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "request refused — check FAL_KEY permissions and Preview protection";
  }
  if (status === 404) return "model or upload target not found";
  if (status === 408 || status === 504 || status === 524) {
    return "timed out — Vercel Hobby may cut the function before fal finishes";
  }
  if (status === 413) return "still too large for the function body limit";
  if (status === 429) return "rate limited — wait and try another take";
  if (status === 422) return "the model rejected the input";
  return "generation failed";
}

export function inspectFalError(err: unknown): { status: number; reason: string } {
  if (err && typeof err === "object" && "status" in err) {
    const status = Number((err as { status: unknown }).status) || 502;
    const body = (err as { body?: unknown }).body;
    const message = err instanceof Error ? err.message : "";
    const reason =
      reasonFromBody(body)
      || (!isBareForbidden(message) && message ? clip(message) : "")
      || fallbackForStatus(status);
    return { status, reason };
  }

  if (err instanceof Error && err.message) {
    const message = err.message;
    const statusMatch = message.match(/\b(401|403|404|408|413|422|429|500|502|504)\b/);
    const status = statusMatch ? Number(statusMatch[1]) : 502;
    const reason = isBareForbidden(message) ? fallbackForStatus(status) : clip(message);
    return { status, reason };
  }

  return { status: 502, reason: fallbackForStatus(502) };
}

export function isAuthFailure(err: unknown): boolean {
  const { status } = inspectFalError(err);
  return status === 401 || status === 403;
}

export function formatGenerateError(status: number, reason: string): GenerateFailure {
  const clean = isBareForbidden(reason) ? fallbackForStatus(status) : clip(reason);
  return {
    error: `fal ${status}: ${clean}`,
    status,
  };
}

/** Do not send HTTP 403 — Vercel/proxies often replace the body with "Forbidden". */
export function clientHttpStatus(falStatus: number): number {
  if (falStatus === 400 || falStatus === 422) return 400;
  if (falStatus === 408 || falStatus === 504 || falStatus === 524) return 504;
  if (falStatus === 413) return 413;
  if (falStatus === 401 || falStatus === 403) return 502;
  if (falStatus >= 400 && falStatus < 500) return 502;
  return 502;
}

export function errorFromHttpBody(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: string; status?: number };
    if (parsed.error && !isBareForbidden(parsed.error)) {
      return parsed.error;
    }
  } catch {
    /* Vercel HTML, SSO pages, etc. */
  }

  const lower = body.toLowerCase();
  if (
    status === 504 ||
    status === 524 ||
    lower.includes("function_invocation") ||
    lower.includes("timeout")
  ) {
    return `HTTP ${status}: timed out — Vercel may have cut the function before fal finished`;
  }
  if (status === 401 || status === 403 || lower.includes("forbidden")) {
    return `HTTP ${status}: request refused — disable Deployment Protection on Preview, and check FAL_KEY`;
  }
  if (status === 413) {
    return `HTTP ${status}: still too large for the function body limit`;
  }
  return `HTTP ${status}: generation failed`;
}
