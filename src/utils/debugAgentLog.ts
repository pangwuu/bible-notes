/** Temporary debug instrumentation — remove after bugfix verified. */
export function debugAgentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  // #region agent log
  const payload = {
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'jump-to-passage',
  };
  try {
    fetch('http://127.0.0.1:7242/ingest/jump-to-passage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'jump-to-passage',
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  // #endregion
}
