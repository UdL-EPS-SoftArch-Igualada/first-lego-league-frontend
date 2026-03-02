export const AUTH_COOKIE_NAME = "APP_AUTH";

// Strategy interface — defines how to obtain the auth credentials
export interface AuthStrategy {
  getAuth(): Promise<string | null>;
}

// Reads the auth cookie from the server side (Next.js SSR)
export class ServerAuthStrategy implements AuthStrategy {
  async getAuth(): Promise<string | null> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  }
}

// Reads the auth cookie or localStorage from the browser
export class ClientAuthStrategy implements AuthStrategy {
  async getAuth(): Promise<string | null> {
    const cookie = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(
      document.cookie
    )?.[1];
    if (cookie) return decodeURIComponent(cookie);
    return localStorage.getItem(AUTH_COOKIE_NAME) ?? null;
  }
}

export const serverAuthProvider: AuthStrategy = new ServerAuthStrategy();

export function clientAuthProvider(): AuthStrategy {
  return new ClientAuthStrategy();
}