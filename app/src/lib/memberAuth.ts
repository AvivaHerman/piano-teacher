// Helpers for reading the wixSession cookie that @wix/astro sets.
// The cookie stores { clientId, tokens } where tokens is the SDK Tokens shape:
// { accessToken: { value, expiresAt }, refreshToken: { value, role } }

export interface WixTokens {
  accessToken: { value: string; expiresAt: number };
  refreshToken: { value: string; role: string };
}

export interface WixSession {
  clientId: string;
  tokens: WixTokens;
}

export function parseSession(cookie: ReturnType<any> | undefined): WixSession | null {
  if (!cookie) return null;
  try {
    const v = cookie.json ? cookie.json() : JSON.parse(decodeURIComponent(cookie.value ?? ""));
    if (v?.clientId && v?.tokens?.accessToken?.value) return v as WixSession;
  } catch {}
  return null;
}

export function isMember(session: WixSession | null): boolean {
  return session?.tokens?.refreshToken?.role === "member";
}
