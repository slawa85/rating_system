/** Reject garbage from older clients that stored `undefined` as a string. */
export function readStoredAuthToken(): string | null {
  const raw = localStorage.getItem('authToken');
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  // Real JWTs are much longer; avoids treating invalid placeholders as tokens.
  if (raw.length < 40) return null;
  return raw;
}
