export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

const KEY = "nxpos.auth.v1";

export const tokenStorage = {
  read(): StoredTokens | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  },
  write(tokens: StoredTokens): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(tokens));
  },
  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  },
};
