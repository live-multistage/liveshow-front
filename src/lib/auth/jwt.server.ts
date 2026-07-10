// Server-only: relies on Buffer (Node.js global, not available in the
// browser). Never import this from a 'use client' file.
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getTokenRememberMe(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.rememberMe === true;
  } catch {
    return false;
  }
}
