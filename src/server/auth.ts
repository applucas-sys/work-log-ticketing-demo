import "server-only";

export class AuthError extends Error {}

export interface SessionUser {
  id: number;
  username: string;
  role: "staff" | "spv" | "ap" | "finance" | "admin";
}

/**
 * Placeholder until real login (Auth.js / Better Auth) is added.
 * Every API that touches files or data must call this first.
 * It refuses all requests unless DEV_ALLOW_NO_AUTH=true.
 */
export async function requireUser(): Promise<SessionUser> {
  if (process.env.DEV_ALLOW_NO_AUTH === "true" && process.env.NODE_ENV !== "production") {
    return { id: 1, username: "dev", role: "admin" };
  }
  throw new AuthError("Login belum tersedia. Set DEV_ALLOW_NO_AUTH=true hanya untuk development lokal.");
}
