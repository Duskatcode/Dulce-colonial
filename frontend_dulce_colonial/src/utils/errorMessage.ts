function normalizePayload(payload: unknown): string | undefined {
  if (payload === undefined || payload === null) return undefined;

  if (typeof payload === 'string') return payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item: unknown) => normalizePayload(item) ?? '')
      .filter(Boolean)
      .join(', ');
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = normalizePayload(record.message);
    if (message) return message;

    const error = normalizePayload(record.error);
    if (error) return error;
  }

  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: Record<string, unknown> } } | undefined;
  const responseData = err?.response?.data;

  const candidates: unknown[] = [
    responseData?.message as unknown,
    responseData?.error as unknown,
    (error as { message?: unknown })?.message,
  ];

  for (const candidate of candidates) {
    const message = normalizePayload(candidate);
    if (message) return message;
  }

  return fallback;
}
